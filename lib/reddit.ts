import axios from 'axios'

export interface RedditPost {
  title: string
  url: string
  subreddit: string
}

/**
 * Search Reddit for posts related to the topics
 * Using Reddit's public JSON API (no auth required for read-only)
 * 
 * Note: Reddit requires a proper User-Agent header. Format: appname:version:platform (contact)
 */
export async function searchRedditPosts(topics: string[]): Promise<RedditPost[]> {
  try {
    const allPosts: RedditPost[] = []
    
    // Search for each main topic
    const searchTerms = topics.slice(0, 3) // Limit to top 3 topics to avoid too many requests
    
    // Reddit requires a specific User-Agent format: appname:version:platform (contact)
    // Using a browser-like User-Agent to avoid 403 errors on serverless functions
    const userAgent = process.env.REDDIT_USER_AGENT || 
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    
    // Try both new and old Reddit endpoints as fallback
    const endpoints = [
      'https://www.reddit.com/search.json',
      'https://old.reddit.com/search.json', // Fallback to old Reddit (sometimes less strict)
    ]

    for (const topic of searchTerms) {
      let success = false
      
      for (const endpoint of endpoints) {
        try {
          // Add small delay between requests to be respectful
          if (allPosts.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }

          // Reddit search endpoint - using .json suffix for JSON response
          const response = await axios.get(endpoint, {
            params: {
              q: topic,
              sort: 'relevance',
              limit: 5,
              t: 'week', // Last week
            },
            headers: {
              'User-Agent': userAgent,
              'Accept': 'application/json',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://www.reddit.com/',
            },
            timeout: 10000, // 10 second timeout
            validateStatus: (status) => status < 500, // Don't throw on 4xx errors
          })

          // Check for rate limiting or blocking
          if (response.status === 403) {
            console.warn(`Reddit returned 403 for topic "${topic}" on ${endpoint}. Trying alternative...`)
            continue // Try next endpoint
          }

          if (response.status === 429) {
            console.warn(`Reddit rate limit hit for topic "${topic}". Waiting before continuing...`)
            await new Promise(resolve => setTimeout(resolve, 2000))
            continue // Try next endpoint
          }

          if (response.data?.data?.children) {
            const posts = response.data.data.children
              .filter((child: any) => child.data && !child.data.over_18) // Filter NSFW
              .map((child: any) => ({
                title: child.data.title,
                url: `https://www.reddit.com${child.data.permalink}`,
                subreddit: child.data.subreddit,
              }))
            
            allPosts.push(...posts)
            success = true
            break // Success, no need to try other endpoints
          }
        } catch (error: any) {
          // Continue with other endpoints if one fails
          if (error.response?.status === 403) {
            console.warn(`Reddit 403 error for topic "${topic}" on ${endpoint}. This is common on serverless platforms.`)
            continue // Try next endpoint
          } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            console.warn(`Reddit timeout for topic "${topic}" on ${endpoint}. Trying alternative...`)
            continue // Try next endpoint
          } else {
            console.error(`Error searching Reddit for topic "${topic}" on ${endpoint}:`, error.message)
            // Don't break, try next endpoint
          }
        }
      }

      // If all endpoints failed for this topic, log it but continue
      if (!success) {
        console.warn(`Failed to fetch Reddit posts for topic "${topic}" from all endpoints. This is common on Vercel/serverless platforms.`)
      }
    }

    // Remove duplicates and limit to 10
    const uniquePosts = Array.from(
      new Map(allPosts.map(post => [post.url, post])).values()
    ).slice(0, 10)

    return uniquePosts
  } catch (error: any) {
    console.error('Error searching Reddit:', error.message)
    return []
  }
}

