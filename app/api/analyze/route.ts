import { NextRequest } from 'next/server'
import { fetchChannelVideos } from '@/lib/youtube'
import { analyzeTopics, generateVideoIdeas } from '@/lib/openai'
import { fetchRelevantNews } from '@/lib/news'
import { searchRedditPosts } from '@/lib/reddit'

// Helper function to send SSE message
function sendSSE(controller: ReadableStreamDefaultController, type: string, data: any) {
  const message = `data: ${JSON.stringify({ type, data })}\n\n`
  controller.enqueue(new TextEncoder().encode(message))
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { url } = await request.json()

        if (!url || typeof url !== 'string') {
          sendSSE(controller, 'error', { message: 'YouTube channel URL is required' })
          controller.close()
          return
        }

        // Step 1: Fetch last 10 videos from YouTube channel
        sendSSE(controller, 'progress', { step: 'fetching_videos', message: 'Fetching YouTube videos...' })
        const videos = await fetchChannelVideos(url)

        if (videos.length === 0) {
          sendSSE(controller, 'error', { message: 'No videos found for this channel' })
          controller.close()
          return
        }

        sendSSE(controller, 'progress', { 
          step: 'videos_fetched', 
          message: `Found ${videos.length} videos`,
          data: { videoCount: videos.length }
        })

        // Step 2: Analyze topics using AI
        sendSSE(controller, 'progress', { step: 'analyzing_topics', message: 'Analyzing topics with AI...' })
        const topics = await analyzeTopics(videos)

        sendSSE(controller, 'progress', { 
          step: 'topics_analyzed', 
          message: `Identified ${topics.length} main topics`,
          data: { topics }
        })

        // Step 3: Fetch relevant news (parallel with Reddit)
        sendSSE(controller, 'progress', { step: 'fetching_news', message: 'Fetching relevant news...' })
        const newsPromise = fetchRelevantNews(topics)

        // Step 4: Search Reddit posts (parallel with news)
        sendSSE(controller, 'progress', { step: 'searching_reddit', message: 'Searching Reddit discussions...' })
        const redditPromise = searchRedditPosts(topics)

        // Wait for both to complete
        const [news, redditPosts] = await Promise.all([newsPromise, redditPromise])

        sendSSE(controller, 'progress', { 
          step: 'news_fetched', 
          message: `Found ${news.length} news articles`,
          data: { news }
        })

        sendSSE(controller, 'progress', { 
          step: 'reddit_searched', 
          message: `Found ${redditPosts.length} Reddit discussions`,
          data: { redditPosts }
        })

        // Step 5: Generate video ideas
        sendSSE(controller, 'progress', { step: 'generating_ideas', message: 'Generating video ideas with AI...' })
        const sampleTitles = videos.map(v => v.title)
        const videoIdeas = await generateVideoIdeas(topics, news, redditPosts, sampleTitles)

        sendSSE(controller, 'progress', { 
          step: 'ideas_generated', 
          message: 'Generated 5 video ideas',
          data: { videoIdeas }
        })

        // Send final result
        sendSSE(controller, 'complete', {
          topics,
          news,
          redditPosts,
          videoIdeas,
        })

        controller.close()
      } catch (error: any) {
        console.error('Error in analyze endpoint:', error)
        sendSSE(controller, 'error', { 
          message: error.message || 'An error occurred while analyzing the channel' 
        })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

