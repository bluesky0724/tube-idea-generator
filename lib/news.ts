import axios from 'axios'

export interface NewsArticle {
  title: string
  url: string
  source: string
}

/**
 * Fetch latest news relevant to the topics
 * Using NewsAPI (free tier) - you can replace with other APIs
 */
export async function fetchRelevantNews(topics: string[]): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY
  
  // If no NewsAPI key, try alternative approach using Google News RSS or return empty
  if (!apiKey) {
    console.warn('NEWS_API_KEY not set, skipping news fetch')
    return []
  }

  try {
    // Get today's date
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Search for news on the main topics
    const mainTopic = topics[0] || topics.join(' ')
    
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: mainTopic,
        from: todayStr,
        sortBy: 'relevancy',
        language: 'en',
        pageSize: 5,
        apiKey: apiKey,
      },
    })

    if (response.data.articles) {
      return response.data.articles
        .filter((article: any) => article.title && article.url)
        .slice(0, 5)
        .map((article: any) => ({
          title: article.title,
          url: article.url,
          source: article.source?.name || 'Unknown',
        }))
    }

    return []
  } catch (error: any) {
    console.error('Error fetching news:', error.message)
    // Return empty array on error - don't fail the whole process
    return []
  }
}

