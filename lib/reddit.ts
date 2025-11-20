import axios from 'axios'

export interface RedditPost {
  title: string
  url: string
  subreddit: string
}

/**
 * Search Reddit for posts related to the topics
 * Using Reddit's public JSON API (no auth required for read-only)
 */
export async function searchRedditPosts(topics: string[]): Promise<RedditPost[]> {
  try {
    const allPosts: RedditPost[] = []
    
    // Search for each main topic
    const searchTerms = topics.slice(0, 3) // Limit to top 3 topics to avoid too many requests
    
    for (const topic of searchTerms) {
      try {
        // Reddit search endpoint
        const response = await axios.get('https://www.reddit.com/search.json', {
          params: {
            q: topic,
            sort: 'relevance',
            limit: 5,
            t: 'week', // Last week
          },
          headers: {
            'User-Agent': 'YouTube-AI-Content-Generator/1.0',
          },
        })

        if (response.data?.data?.children) {
          const posts = response.data.data.children
            .filter((child: any) => child.data && !child.data.over_18) // Filter NSFW
            .map((child: any) => ({
              title: child.data.title,
              url: `https://www.reddit.com${child.data.permalink}`,
              subreddit: child.data.subreddit,
            }))
          
          allPosts.push(...posts)
        }
      } catch (error) {
        // Continue with other topics if one fails
        console.error(`Error searching Reddit for topic "${topic}":`, error)
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

