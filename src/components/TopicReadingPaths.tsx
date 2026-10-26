import { Link } from 'react-router-dom'
import { posts } from '../lib/blog'
import { topics, topicArticles } from '../lib/topics'

export function TopicReadingPaths() {
  return <section aria-labelledby="reading-paths" className="mb-12 border-y border-outline py-8">
    <h2 id="reading-paths" className="text-2xl font-semibold">Find a starting point</h2>
    <p className="mt-3 max-w-2xl text-muted">Healthcare software, learning resources, and practical tools are the direction of this work. These reading paths start with what is published today.</p>
    <div className="mt-6 grid gap-8 sm:grid-cols-2">
      {topics.map(topic => {
        const articles = topicArticles(topic, posts)
        return articles.length ? <div key={topic.id}>
          <h3 className="text-lg font-medium">{topic.title}</h3>
          <p className="mt-2 text-sm text-muted">{topic.description}</p>
          <ul className="mt-3 space-y-3">{articles.map(article => <li key={article.slug}><Link className="text-accent underline underline-offset-4" to={`/blog/${article.slug}`}>{article.metadata.title}</Link></li>)}</ul>
        </div> : null
      })}
    </div>
    <p className="mt-6 text-sm text-muted">Healthcare tools are planned. <Link className="text-accent underline underline-offset-4" to="/projects">Explore the project roadmap and current engineering work</Link>.</p>
  </section>
}
