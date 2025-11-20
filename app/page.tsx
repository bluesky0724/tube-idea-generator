'use client'

import { useState } from 'react'
import styles from './page.module.css'

interface VideoIdea {
  title: string
  thumbDesign: string
  videoIdea: string
}

interface AnalysisResult {
  topics: string[]
  news: Array<{ title: string; url: string; source: string }>
  redditPosts: Array<{ title: string; url: string; subreddit: string }>
  videoIdeas: VideoIdea[]
}

interface ProgressStep {
  step: string
  message: string
  completed?: boolean
  data?: any
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressStep[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)
    setProgress([
      { step: 'starting', message: 'Starting analysis...', completed: false }
    ])

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error('Failed to start analysis')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response stream available')
      }

      let buffer = ''

      // Define step order for proper display
      const stepOrder = [
        'starting',
        'fetching_videos',
        'videos_fetched',
        'analyzing_topics',
        'topics_analyzed',
        'fetching_news',
        'searching_reddit',
        'news_fetched',
        'reddit_searched',
        'generating_ideas',
        'ideas_generated',
      ]

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'progress') {
                setProgress((prev) => {
                  const stepIndex = stepOrder.indexOf(data.data.step)
                  const existing = prev.findIndex(p => p.step === data.data.step)
                  const newStep: ProgressStep = {
                    step: data.data.step,
                    message: data.data.message,
                    completed: true,
                    data: data.data.data,
                  }
                  
                  if (existing >= 0) {
                    const updated = [...prev]
                    updated[existing] = newStep
                    // Sort by step order
                    return updated.sort((a, b) => {
                      const aIndex = stepOrder.indexOf(a.step)
                      const bIndex = stepOrder.indexOf(b.step)
                      return aIndex - bIndex
                    })
                  }
                  const updated = [...prev, newStep]
                  // Sort by step order
                  return updated.sort((a, b) => {
                    const aIndex = stepOrder.indexOf(a.step)
                    const bIndex = stepOrder.indexOf(b.step)
                    return aIndex - bIndex
                  })
                })
              } else if (data.type === 'complete') {
                setResult(data.data)
                setLoading(false)
              } else if (data.type === 'error') {
                throw new Error(data.data.message)
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError)
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>YouTube AI Content Ideas Generator</h1>
        <p className={styles.subtitle}>
          Enter a YouTube channel URL to get AI-powered video ideas
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/@channelname or https://www.youtube.com/c/channelname"
            className={styles.input}
            disabled={loading}
          />
          <button
            type="submit"
            className={styles.button}
            disabled={loading || !url.trim()}
          >
            {loading ? 'Analyzing...' : 'Generate Ideas'}
          </button>
        </form>

        {error && (
          <div className={styles.error}>
            <p>Error: {error}</p>
          </div>
        )}

        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <div className={styles.progressContainer}>
              <h3>Analysis Progress</h3>
              <div className={styles.progressSteps}>
                {progress.map((step, idx) => (
                  <div key={step.step} className={`${styles.progressStep} ${step.completed ? styles.completed : ''}`}>
                    <div className={styles.progressIndicator}>
                      {step.completed ? '✅' : '⏳'}
                    </div>
                    <span>{step.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className={styles.results}>
            <section className={styles.section}>
              <h2>Identified Topics</h2>
              <div className={styles.topics}>
                {result.topics.map((topic, idx) => (
                  <span key={idx} className={styles.topic}>
                    {topic}
                  </span>
                ))}
              </div>
            </section>

            {result.news.length > 0 && (
              <section className={styles.section}>
                <h2>Relevant News (Today)</h2>
                <div className={styles.newsList}>
                  {result.news.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.newsItem}
                    >
                      <span className={styles.newsSource}>{item.source}</span>
                      <span className={styles.newsTitle}>{item.title}</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {result.redditPosts.length > 0 && (
              <section className={styles.section}>
                <h2>Reddit Discussions</h2>
                <div className={styles.redditList}>
                  {result.redditPosts.map((post, idx) => (
                    <a
                      key={idx}
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.redditItem}
                    >
                      <span className={styles.redditSubreddit}>r/{post.subreddit}</span>
                      <span className={styles.redditTitle}>{post.title}</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            <section className={styles.section}>
              <h2>Generated Video Ideas</h2>
              <div className={styles.ideas}>
                {result.videoIdeas.map((idea, idx) => (
                  <div key={idx} className={styles.ideaCard}>
                    <h3 className={styles.ideaTitle}>{idea.title}</h3>
                    <div className={styles.ideaContent}>
                      <div className={styles.ideaSection}>
                        <strong>Thumb Design:</strong>
                        <p>{idea.thumbDesign}</p>
                      </div>
                      <div className={styles.ideaSection}>
                        <strong>Video Idea:</strong>
                        <p>{idea.videoIdea}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}

