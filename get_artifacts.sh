#!/bin/bash
set -e

# TitanLRS Configuration
GITHUB_REPO="Titan-Dynamics/TitanLRS"
GITHUB_BACKPACK_REPO="Titan-Dynamics/TitanLRS-Backpack"

github_api_get() {
  local url="$1"
  curl -fsSL "${url}" || return 1
}

fetch_release_json() {
  local repo="$1"
  local tag="$2"
  local json

  if json=$(github_api_get "https://api.github.com/repos/${repo}/releases/tags/${tag}"); then
    printf '%s\n' "${json}"
    return 0
  fi

  local alt_tag
  if [ "${tag#v}" != "${tag}" ]; then
    alt_tag="${tag#v}"
  else
    alt_tag="v${tag}"
  fi

  if json=$(github_api_get "https://api.github.com/repos/${repo}/releases/tags/${alt_tag}"); then
    printf '%s\n' "${json}"
    return 0
  fi

  return 1
}

find_release_asset_url() {
  local release_json="$1"
  local version="$2"
  local prefix="$3"

  printf '%s\n' "${release_json}" | awk -v version="${version}" -v prefix="${prefix}" '
    BEGIN {
      name=""
      first_zip=""
    }
    /"name":/ {
      name=$0
      gsub(/.*"name":[[:space:]]*"/, "", name)
      gsub(/".*/, "", name)
      next
    }
    /"browser_download_url":/ {
      url=$0
      gsub(/.*"browser_download_url":[[:space:]]*"/, "", url)
      gsub(/".*/, "", url)

      if (prefix != "" && name ~ ("^" prefix) && name ~ version && name ~ /\.zip$/) {
        print url
        exit
      }

      if (name ~ version && name ~ /\.zip$/) {
        print url
        exit
      }

      if (name ~ /\.zip$/ && first_zip == "") {
        first_zip = url
      }
    }
    END {
      if (first_zip != "") {
        print first_zip
      }
    }
  '
}

fetch_all_release_versions() {
  local repo="$1"
  local page=1
  local tags
  while :; do
    tags=$(github_api_get "https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}" |
      sed -n 's/^[[:space:]]*"tag_name": "\(.*\)",/\1/p') || return 1
    if [ -z "${tags}" ]; then
      break
    fi
    printf '%s\n' "${tags}"
    page=$((page + 1))
  done | sed 's/^v//'
}

write_index_json() {
  local output_path="$1"
  shift
  local versions=("$@")
  {
    echo "{"
    echo "  \"tags\": {"
    local first=1
    local version
    for version in "${versions[@]}"; do
      if [ ${first} -eq 0 ]; then
        echo ","
      fi
      printf "    \"%s\": \"%s\"" "${version}" "${version}"
      first=0
    done
    echo ""
    echo "  },"
    echo "  \"branches\": {}"
    echo "}"
  } > "${output_path}"
}

REQUESTED_VERSION="${1#v}"

if [ -n "${REQUESTED_VERSION}" ]; then
  FIRMWARE_VERSIONS="${REQUESTED_VERSION}"
  BACKPACK_VERSIONS="${REQUESTED_VERSION}"
else
  FIRMWARE_VERSIONS=$(fetch_all_release_versions "${GITHUB_REPO}") || {
    echo "❌ Error: Failed to fetch firmware releases"
    exit 1
  }

  if [ -z "${FIRMWARE_VERSIONS}" ]; then
    echo "❌ Error: No firmware releases found"
    exit 1
  fi

  BACKPACK_VERSIONS=$(fetch_all_release_versions "${GITHUB_BACKPACK_REPO}") || {
    echo "❌ Error: Failed to fetch backpack releases"
    exit 1
  }

  if [ -z "${BACKPACK_VERSIONS}" ]; then
    echo "❌ Error: No backpack releases found"
    exit 1
  fi
fi

# Directories
ASSETS_DIR="public/assets"
FIRMWARE_DIR="${ASSETS_DIR}/firmware"

echo "================================================"
echo "  TitanLRS Firmware Downloader"
echo "================================================"
echo "Repository: ${GITHUB_REPO}"
echo "Firmware releases: ${GITHUB_REPO}"
echo "Backpack releases: ${GITHUB_BACKPACK_REPO}"
echo ""

# Create directory structure
mkdir -p "${ASSETS_DIR}"
cd "${ASSETS_DIR}"

# Remove old firmware files
echo "🧹 Cleaning old firmware..."
rm -rf firmware backpack

# Create firmware directory structure
mkdir -p firmware
cd firmware

echo "📥 Downloading TitanLRS firmware releases..."
readarray -t firmware_versions <<< "${FIRMWARE_VERSIONS}"
for version in "${firmware_versions[@]}"; do
  if ! release_json=$(fetch_release_json "${GITHUB_REPO}" "v${version}"); then
    echo ""
    echo "❌ Error: Failed to fetch release metadata for firmware version ${version}"
    echo ""
    exit 1
  fi

  FIRMWARE_URL=$(find_release_asset_url "${release_json}" "${version}" "firmware-")

  if [ -z "${FIRMWARE_URL}" ]; then
    echo ""
    echo "❌ Error: No firmware zip asset found for version ${version}"
    echo ""
    exit 1
  fi

  echo "URL: ${FIRMWARE_URL}"

  curl -L -f "${FIRMWARE_URL}" -o firmware.zip || {
    echo ""
    echo "❌ Error: Failed to download firmware version ${version}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check version exists at: https://github.com/${GITHUB_REPO}/releases"
    echo "2. Verify version format (e.g., 'x.y.z' not 'vx.y.z')"
    echo "3. Ensure release is published (not draft)"
    echo ""
    exit 1
  }

  # Extract firmware into version-specific directory
  echo "📦 Extracting firmware ${version}..."
  mkdir -p "${version}"
  cd "${version}"
  unzip -q ../firmware.zip

  # Handle nested firmware directory if it exists
  if [ -d "firmware-${version}" ]; then
    echo "Moving firmware-${version} contents..."
    shopt -s dotglob 2>/dev/null || true  # Enable hidden files in bash
    mv firmware-${version}/* . 2>/dev/null || cp -r firmware-${version}/* . && rm -rf firmware-${version}
  elif [ -d "firmware" ]; then
    echo "Moving firmware contents..."
    shopt -s dotglob 2>/dev/null || true
    mv firmware/* . 2>/dev/null || cp -r firmware/* . && rm -rf firmware
  fi

  cd ..
  rm firmware.zip
done

# Download hardware definitions from master branch
echo "📥 Downloading hardware definitions..."
mkdir -p hardware
cd hardware
HARDWARE_URL="https://raw.githubusercontent.com/${GITHUB_REPO}/master/src/hardware/targets.json"
curl -L -f "${HARDWARE_URL}" -o targets.json || {
  echo "⚠️  Warning: Could not download targets.json from master branch"
  echo "Using targets.json from firmware archive if available..."
  first_version="${firmware_versions[0]}"
  if [ -f "../${first_version}/hardware/targets.json" ]; then
    cp "../${first_version}/hardware/targets.json" .
    echo "✓ Using targets.json from firmware ${first_version}"
  else
    echo "❌ Error: No targets.json found"
    exit 1
  fi
}

cd ..

# Create index.json for the web flasher to discover versions
echo "📝 Creating index.json..."
write_index_json index.json "${firmware_versions[@]}"

cd ..

# Download TitanLRS Backpack firmware
echo ""
echo "📥 Downloading TitanLRS Backpack firmware releases..."
mkdir -p backpack
cd backpack

readarray -t backpack_versions <<< "${BACKPACK_VERSIONS}"
for version in "${backpack_versions[@]}"; do
  if ! release_json=$(fetch_release_json "${GITHUB_BACKPACK_REPO}" "v${version}"); then
    echo ""
    echo "❌ Error: Failed to fetch release metadata for backpack version ${version}"
    echo ""
    exit 1
  fi

  BACKPACK_URL=$(find_release_asset_url "${release_json}" "${version}" "backpack-")

  if [ -z "${BACKPACK_URL}" ]; then
    echo ""
    echo "❌ Error: No backpack zip asset found for version ${version}"
    echo ""
    exit 1
  fi

  echo "URL: ${BACKPACK_URL}"

  curl -L -f "${BACKPACK_URL}" -o backpack.zip || {
    echo ""
    echo "❌ Error: Failed to download backpack version ${version}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check version exists at: https://github.com/${GITHUB_BACKPACK_REPO}/releases"
    echo "2. Verify version format (e.g., 'x.y.z' not 'vx.y.z')"
    echo "3. Ensure release is published (not draft)"
    echo ""
    exit 1
  }

  echo "📦 Extracting backpack firmware ${version}..."
  mkdir -p "${version}"
  cd "${version}"
  unzip -q ../backpack.zip

  if [ -d "backpack-${version}" ]; then
    echo "Moving backpack-${version} contents..."
    shopt -s dotglob 2>/dev/null || true  # Enable hidden files in bash
    mv backpack-${version}/* . 2>/dev/null || cp -r backpack-${version}/* . && rm -rf backpack-${version}
  elif [ -d "backpack" ]; then
    echo "Moving backpack contents..."
    shopt -s dotglob 2>/dev/null || true
    mv backpack/* . 2>/dev/null || cp -r backpack/* . && rm -rf backpack
  fi

  cd ..
  rm backpack.zip
done

write_index_json index.json "${backpack_versions[@]}"

cd ..

echo ""
echo "✅ Firmware downloads completed successfully!"
echo "📂 Location: ${FIRMWARE_DIR}/"
echo ""

# Show directory structure
echo "Directory structure:"
if [ -n "${firmware_versions[0]}" ] && [ -d "${FIRMWARE_DIR}/${firmware_versions[0]}" ]; then
  echo "firmware/"
  echo "├── ${firmware_versions[0]}/"
  ls "${FIRMWARE_DIR}/${firmware_versions[0]}" | head -10 | sed 's/^/│   ├── /'
  echo "├── hardware/"
  echo "│   └── targets.json"
fi

echo ""
echo "================================================"
echo "Ready for development!"
echo "Run: npm run dev"
echo "================================================"
