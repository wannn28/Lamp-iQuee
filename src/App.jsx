import { useEffect, useRef, useState } from 'react'
import Lamp from './Lamp.jsx'

const FINISHES = [
  { id: 'linen', name: 'Linen', hex: '#e4d3be' },
  { id: 'clay', name: 'Clay', hex: '#c15b3f' },
  { id: 'moss', name: 'Moss', hex: '#667254' },
  { id: 'ink', name: 'Ink', hex: '#2a2622' },
]

const SPECS = [
  ['Form', 'Single-arm desk lamp'],
  ['Height, assembled', '42 cm'],
  ['Shade opening', '18 cm'],
  ['Arm', 'One fold, brass pin'],
  ['Light', '2700 K, dimmed from a ring on the foot'],
  ['Cord', '1.8 m, cloth covered'],
  ['Weight', '1.4 kg'],
]

export default function App() {
  const stageRef = useRef(null)
  const explosionRef = useRef(0)
  const [finishIndex, setFinishIndex] = useState(0)
  const [focus, setFocus] = useState('shade')
  const [kept, setKept] = useState(null)
  const color = FINISHES[finishIndex].hex
  const finishName = FINISHES[finishIndex].name

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined

    const onScroll = () => {
      const rect = stage.getBoundingClientRect()
      const room = stage.offsetHeight - window.innerHeight
      const passed = Math.min(Math.max(-rect.top, 0), Math.max(room, 1))
      const next = room > 0 ? passed / room : 0
      explosionRef.current = next
      stage.style.setProperty('--explode', next.toFixed(4))
      const part = next < 0.34 ? 'shade' : next < 0.67 ? 'bulb' : 'base'
      setFocus((current) => (current === part ? current : part))
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  function onSubmit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setKept({
      name: String(data.get('name') || '').trim(),
    })
  }

  return (
    <div className="page">
      <main id="top">
        <section className="stage" ref={stageRef} aria-label="Fold Lamp model">
          <div className="stage-sticky">
            <div className="canvas-wrap">
              <Lamp
                explosionRef={explosionRef}
                color={color}
                onCycle={() => setFinishIndex((index) => (index + 1) % FINISHES.length)}
              />
            </div>
            <p className="corner">
              <strong>Fold Lamp</strong>
              <span>Pull the cord. The shade changes color.</span>
            </p>
            <aside className="part-notes">
              <p className={focus === 'shade' ? 'part-note shade is-on' : 'part-note shade'}>
                <strong>Shade</strong>
                Pressed cotton paper. The cord changes this color.
              </p>
              <p className={focus === 'bulb' ? 'part-note bulb is-on' : 'part-note bulb'}>
                <strong>Bulb</strong>
                Frosted glass over a warm 2700 K LED.
              </p>
              <p className={focus === 'base' ? 'part-note base is-on' : 'part-note base'}>
                <strong>Base</strong>
                Spun brass with a weighted foot.
              </p>
            </aside>
            <p className="live-color">{finishName}</p>
          </div>
        </section>

        <section className="sheet" id="specs">
          <div className="sheet-inner">
            <p className="kicker">Specifications</p>
            <h2>Written down, not listed for sale</h2>
            <p className="lead">
              These figures belong to the demonstration. They describe the model on this page, not a lamp you can order.
            </p>
            <dl className="spec-list">
              {SPECS.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="sheet materials" id="materials">
          <div className="sheet-inner">
            <p className="kicker">Materials</p>
            <h2>Paper, glass, and brass</h2>
            <div className="material">
              <h3>Shade</h3>
              <p>
                Pressed cotton paper, dyed through in linen, clay, moss, or ink, with a pale cloth lining. Pulling the cord on this page only changes the model.
              </p>
            </div>
            <div className="material">
              <h3>Bulb</h3>
              <p>
                A frosted glass capsule over a warm LED, 2700 K. It stays with the lamp. There is no replacement to add to a cart, because there is no cart.
              </p>
            </div>
            <div className="material">
              <h3>Base</h3>
              <p>
                Spun brass with a clear lacquer and a weighted foot, so the single fold does not tip. A small button on the disc is the dimmer in the story of the object.
              </p>
            </div>
          </div>
        </section>

        <section className="contact-band" id="contact">
          <div className="sheet-inner">
            <p className="kicker">Contact</p>
            <h2>Leave a note</h2>
            <p className="lead">For the demonstration only. Nobody is waiting on the other side.</p>
            <form className="note-form" onSubmit={onSubmit}>
              <p className="form-note">
                This form does not send email and does not reach an API or a server. What you type stays in this browser until you reload the page.
              </p>
              <label>
                Name
                <input name="name" type="text" autoComplete="name" required maxLength={80} />
              </label>
              <label>
                Email
                <input name="email" type="email" autoComplete="email" required maxLength={120} />
              </label>
              <label>
                Message
                <textarea name="message" rows={4} required maxLength={600} />
              </label>
              <button type="submit">Keep it on this page</button>
              {kept && (
                <p className="kept" role="status">
                  Nothing was sent{kept.name ? `, ${kept.name}` : ''}. The note is only here, and a reload clears it.
                </p>
              )}
            </form>
          </div>
        </section>
      </main>

      <footer className="colophon">
        <p>Fold Lamp and this page are a demonstration. The lamp is fictional.</p>
      </footer>
    </div>
  )
}
