import axios from 'axios'

export interface YouTubeVideo {
  id: string
  title: string
  description: string
  publishedAt: string
  thumbnail: string
}

/**
 * Extract channel ID or username from YouTube URL
 */
function extractChannelIdentifier(url: string): { type: 'id' | 'username' | 'handle'; value: string } | null {
  // Handle different YouTube URL formats
  const patterns = [
    { regex: /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/, type: 'id' as const },
    { regex: /youtube\.com\/c\/([a-zA-Z0-9_-]+)/, type: 'username' as const },
    { regex: /youtube\.com\/user\/([a-zA-Z0-9_-]+)/, type: 'username' as const },
    { regex: /youtube\.com\/@([a-zA-Z0-9_-]+)/, type: 'handle' as const },
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern.regex)
    if (match) {
      return { type: pattern.type, value: match[1] }
    }
  }

  return null
}

/**
 * Get channel ID from username or handle using YouTube Data API
 */
async function getChannelId(identifier: string, type: 'username' | 'handle'): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not set')
  }

  try {
    const forUsername = type === 'username' ? identifier : undefined
    const forHandle = type === 'handle' ? identifier.replace('@', '') : undefined

    // Try username first
    if (forUsername) {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'id',
          forUsername: forUsername,
          key: apiKey,
        },
      })

      if (response.data.items && response.data.items.length > 0) {
        return response.data.items[0].id
      }
    }

    // Try handle (newer format) - use channels.list with handle parameter
    if (forHandle) {
      try {
        // First try the direct handle lookup (if supported)
        const handleResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
          params: {
            part: 'id',
            forHandle: forHandle,
            key: apiKey,
          },
        })

        if (handleResponse.data.items && handleResponse.data.items.length > 0) {
          return handleResponse.data.items[0].id
        }
      } catch (e) {
        // If forHandle parameter doesn't work, fall back to search
      }

      // Fallback: use search API
      const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: forHandle,
          type: 'channel',
          key: apiKey,
          maxResults: 5,
        },
      })

      if (searchResponse.data.items && searchResponse.data.items.length > 0) {
        // Find exact match by customUrl or title
        const exactMatch = searchResponse.data.items.find((item: any) => 
          item.snippet.customUrl?.toLowerCase() === `@${forHandle.toLowerCase()}` ||
          item.snippet.title?.toLowerCase().includes(forHandle.toLowerCase())
        )
        
        if (exactMatch) {
          return exactMatch.snippet.channelId
        }
        
        // Return first result if no exact match
        return searchResponse.data.items[0].snippet.channelId
      }
    }

    return null
  } catch (error) {
    console.error('Error getting channel ID:', error)
    return null
  }
}

/**
 * Fetch last 10 videos from a YouTube channel
 */
export async function fetchChannelVideos(url: string): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not set')
  }

  const identifier = extractChannelIdentifier(url)
  if (!identifier) {
    throw new Error('Invalid YouTube channel URL')
  }

  let channelId = identifier.value

  // If it's a username or handle, get the channel ID first
  if (identifier.type !== 'id') {
    const resolvedId = await getChannelId(identifier.value, identifier.type)
    if (!resolvedId) {
      throw new Error('Could not resolve channel ID from URL')
    }
    channelId = resolvedId
  }

  try {
    // Get uploads playlist ID
    const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'contentDetails',
        id: channelId,
        key: apiKey,
      },
    })

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      throw new Error('Channel not found')
    }

    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads

    // Get videos from uploads playlist
    const playlistResponse = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
      params: {
        part: 'snippet',
        playlistId: uploadsPlaylistId,
        maxResults: 10,
        key: apiKey,
      },
    })

    const videos: YouTubeVideo[] = playlistResponse.data.items.map((item: any) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
    }))

    return videos
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('YouTube API quota exceeded or invalid API key')
    }
    if (error.response?.status === 404) {
      throw new Error('Channel not found')
    }
    throw new Error(`Failed to fetch videos: ${error.message}`)
  }
}

