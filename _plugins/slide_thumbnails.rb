# Downloads remote card thumbnails (home slides, projects) at build time and
# serves them from /assets/cache/slides/ so visitors never hit the third-party
# host. Files are content-addressed by URL and kept in .cache/thumbs between
# builds (persisted in CI with actions/cache). Failures are logged and skipped;
# the template falls back to the remote URL and then to a placeholder.
require "digest"
require "fileutils"
require "net/http"
require "uri"

module SlideThumbnails
  SOURCES = [%w[home slides], %w[projects items]].freeze
  CACHE_ROOT = ".cache/thumbs"
  PUBLIC_DIR = "assets/cache/slides"
  MAX_BYTES = 5 * 1024 * 1024
  EXTENSIONS = {
    "image/png" => ".png", "image/jpeg" => ".jpg",
    "image/webp" => ".webp", "image/gif" => ".gif",
  }.freeze

  class Generator < Jekyll::Generator
    safe true
    priority :high

    def generate(site)
      cards = SOURCES.flat_map { |path| Array(site.data.dig(*path)) }
      return if cards.empty?

      base = File.join(site.source, CACHE_ROOT)
      dir = File.join(base, PUBLIC_DIR)
      FileUtils.mkdir_p(dir)

      cards.each do |slide|
        url = slide["thumbnail"].to_s
        next unless url.start_with?("http://", "https://")

        name = cached_name(dir, url) || download(dir, url)
        next unless name

        site.static_files << Jekyll::StaticFile.new(site, base, PUBLIC_DIR, name)
        slide["thumbnail_local"] = "/#{PUBLIC_DIR}/#{name}"
      end
    end

    private

    def key(url)
      Digest::SHA1.hexdigest(url)[0, 16]
    end

    def cached_name(dir, url)
      found = Dir.glob(File.join(dir, "#{key(url)}.*")).first
      found && File.basename(found)
    end

    def download(dir, url, redirects = 5)
      uri = URI(url)
      redirects.times do
        res = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https",
                              open_timeout: 10, read_timeout: 30) do |http|
          http.get(uri.request_uri, "User-Agent" => "isfa.dev thumbnail cache")
        end
        if res.is_a?(Net::HTTPRedirection)
          uri = URI.join(uri.to_s, res["location"])
          next
        end
        ext = EXTENSIONS[res["content-type"].to_s.split(";").first]
        unless res.is_a?(Net::HTTPSuccess) && ext && res.body.bytesize.between?(1, MAX_BYTES)
          Jekyll.logger.warn "Thumbnails:", "skipped #{url} (#{res.code} #{res["content-type"]})"
          return nil
        end
        name = "#{key(url)}#{ext}"
        File.binwrite(File.join(dir, name), res.body)
        return name
      end
      nil
    rescue StandardError => e
      Jekyll.logger.warn "Thumbnails:", "failed #{url} (#{e.class}: #{e.message})"
      nil
    end
  end
end
