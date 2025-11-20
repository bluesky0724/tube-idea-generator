import OpenAI from 'openai'
import { YouTubeVideo } from './youtube'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Analyze videos to understand topics covered
 */
export async function analyzeTopics(videos: YouTubeVideo[]): Promise<string[]> {
  const videoTitles = videos.map(v => v.title).join('\n')
  const videoDescriptions = videos
    .map(v => v.description)
    .slice(0, 500) // Limit description length
    .join('\n\n')

  const prompt = `Analyze the following YouTube video titles and descriptions from a channel's last 10 videos. 
Extract the main topics, themes, and subject areas covered. Return a list of 5-8 key topics as a JSON array of strings.

Titles:
${videoTitles}

Descriptions (excerpts):
${videoDescriptions}

Return ONLY a JSON array of topic strings, nothing else. Example: ["Technology", "AI", "Programming", "Web Development"]`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that analyzes YouTube content to identify topics. Always return a JSON object with a "topics" array.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const parsed = JSON.parse(content)
    // Handle both {topics: [...]} and [...] formats
    const topics = parsed.topics || (Array.isArray(parsed) ? parsed : [])
    return Array.isArray(topics) ? topics : []
  } catch (error: any) {
    console.error('Error analyzing topics:', error)
    // Fallback: extract keywords from titles
    const allText = videos.map(v => v.title).join(' ')
    const words = allText.toLowerCase().split(/\s+/)
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'this', 'that', 'how', 'what', 'why', 'when', 'where'])
    const keywords = [...new Set(words.filter(w => w.length > 4 && !commonWords.has(w)))]
    return keywords.slice(0, 8)
  }
}

/**
 * Generate video ideas based on topics, news, and Reddit discussions
 */
export async function generateVideoIdeas(
  topics: string[],
  news: Array<{ title: string; url: string; source: string }>,
  redditPosts: Array<{ title: string; url: string; subreddit: string }>,
  sampleTitles: string[]
): Promise<Array<{ title: string; thumbDesign: string; videoIdea: string }>> {
  const topicsText = topics.join(', ')
  const newsText = news.map(n => n.title).join('\n')
  const redditText = redditPosts.map(p => p.title).join('\n')
  const sampleTitlesText = sampleTitles.join('\n')

  const prompt = `You are a YouTube content strategist. Based on the following information, generate 5 video ideas that match the channel's style and are relevant to current trends.

Channel Topics: ${topicsText}

Recent News:
${newsText || 'No recent news available'}

Reddit Discussions:
${redditText || 'No Reddit discussions found'}

Sample Video Titles from Channel (for style reference):
${sampleTitlesText}

Generate 5 video ideas. Each idea should include:
1. TITLE - A catchy title in the same style as the sample titles
2. THUMB DESIGN - Description of thumbnail design (colors, text, imagery)
3. VIDEO IDEA - A detailed description of the video concept (2-3 sentences)

Return a JSON object with this structure:
{
  "ideas": [
    {
      "title": "Video Title Here",
      "thumbDesign": "Thumbnail design description",
      "videoIdea": "Detailed video concept description"
    }
  ]
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a creative YouTube content strategist. Generate engaging, relevant video ideas that match the channel style.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const parsed = JSON.parse(content)
    const ideas = parsed.ideas || []
    
    if (!Array.isArray(ideas) || ideas.length === 0) {
      throw new Error('Invalid response format')
    }

    return ideas.slice(0, 5)
  } catch (error: any) {
    console.error('Error generating video ideas:', error)
    // Fallback ideas
    return topics.slice(0, 5).map(topic => ({
      title: `Latest Updates on ${topic} - 2024`,
      thumbDesign: 'Bold text on gradient background with relevant icon, bright colors to stand out',
      videoIdea: `Create a comprehensive video covering the latest developments and trends in ${topic}, including recent news and community discussions.`,
    }))
  }
}

