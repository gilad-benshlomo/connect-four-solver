import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app element in index.html')
}

app.innerHTML = `
  <h1>Connect Four Solver</h1>
  <p>Coming soon.</p>
`