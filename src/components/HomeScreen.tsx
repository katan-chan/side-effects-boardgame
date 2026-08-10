interface HomeScreenProps {
  onLocal: () => void
  onOnline: () => void
}

export function HomeScreen({ onLocal, onOnline }: HomeScreenProps) {
  return (
    <main className="setup-screen">
      <section className="panel home-screen">
        <h1>Side Effects</h1>
        <p>Choose how you want to play.</p>
        <div className="button-row">
          <button type="button" className="primary" onClick={onLocal}>
            Local Game
          </button>
          <button type="button" onClick={onOnline}>
            Online Game
          </button>
        </div>
      </section>
    </main>
  )
}
