const projects = [
  { name: 'Portfolio Page', desc: 'This site. Vite + React, deployed with GitHub Pages.', link: 'https://github.com/andrew-second/Portfolio_Page' },
]

export default function App() {
  return (
    <main>
      <header>
        <h1>Andrew</h1>
        <p>Developer. Building things and learning in public.</p>
        <a href="https://github.com/andrew-second">GitHub</a>
      </header>

      <section>
        <h2>Projects</h2>
        <ul>
          {projects.map((p) => (
            <li key={p.name}>
              <a href={p.link}>{p.name}</a>
              <p>{p.desc}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
