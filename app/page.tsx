const principles = [
  ["Preserve", "Keep original Khowar text, provenance, consent, and contribution history intact."],
  ["Validate", "Separate submitted data from reviewed and validated linguistic records."],
  ["Connect", "Bring contributors, validators, researchers, and experts into one accountable platform."],
];

export default function Home() {
  return (
    <main>
      <nav className="nav">
        <div className="brand"><span className="mark">KD</span><span>Khowar Dataset</span></div>
        <div className="navLinks">
          <a href="#mission">Mission</a><a href="#dataset">Dataset</a><a href="#contribute">Contribute</a><a href="#about">About</a><a href="/login">Sign in</a>
        </div>
        <a className="button buttonSmall" href="#contribute">Contribute</a>
      </nav>

      <section className="hero">
        <div className="eyebrow">KHOWAR LANGUAGE PRESERVATION PLATFORM</div>
        <h1>Preserving Khowar.<br/><span>Building knowledge.</span></h1>
        <p className="heroText">A serious, community-powered infrastructure for collecting, preserving, validating, researching, and responsibly preparing Khowar language data for the digital future.</p>
        <div className="actions"><a className="button" href="#contribute">Contribute to Khowar</a><a className="button buttonGhost" href="#dataset">Explore the dataset</a></div>
        <div className="trustLine">Human-contributed data · Provenance preserved · Validation transparent</div>
      </section>

      <section id="mission" className="section">
        <div className="sectionLabel">01 / MISSION</div>
        <div className="sectionGrid"><div><h2>Khowar belongs in the digital world.</h2></div><div><p> KD Website is designed as a long-term cultural preservation, linguistic research, community contribution, and AI-readiness platform—not simply a crowdsourcing app.</p><p>Every record can retain its original text, source, dialect, region, consent, licensing, validation history, and revision history.</p></div></div>
      </section>

      <section className="principles">{principles.map(([title,text])=><article key={title}><div className="number">0{principles.indexOf([title,text]) + 1}</div><h3>{title}</h3><p>{text}</p></article>)}</section>

      <section id="dataset" className="section dark">
        <div className="sectionLabel">02 / DATASET</div>
        <h2>A trustworthy language resource, built from real contributions.</h2>
        <p className="muted">Production statistics will appear here from the database. No fabricated counts or sample Khowar records are presented as real data.</p>
        <div className="stats"><div><strong>—</strong><span>Validated words</span></div><div><strong>—</strong><span>Validated sentences</span></div><div><strong>—</strong><span>Audio duration</span></div><div><strong>—</strong><span>Regions represented</span></div></div>
      </section>

      <section id="contribute" className="section">
        <div className="sectionLabel">03 / CONTRIBUTE</div><h2>Every contribution has a provenance.</h2>
        <div className="cards"><div><b>Word</b><span>Add Khowar vocabulary, meanings, dialect and source.</span></div><div><b>Sentence</b><span>Preserve natural Khowar sentences with translations and context.</span></div><div><b>Voice</b><span>Record pronunciation and speech with explicit consent and licensing.</span></div><div><b>Proverb & Story</b><span>Preserve cultural expressions, stories, attribution and context.</span></div></div>
      </section>

      <section id="about" className="section about"><div><div className="sectionLabel">04 / ABOUT</div><h2>Designed for contributors today. Ready for researchers tomorrow.</h2></div><p>The website architecture will support authentication, contributor profiles, offline-capable collection workflows where appropriate, validation queues, expert review, dataset search, role-based access, audit logs, dataset releases, and authorized research exports.</p></section>

      <footer><div className="brand"><span className="mark">KD</span><span>Khowar Dataset</span></div><span>Preserving Khowar. Building knowledge.</span></footer>
    </main>
  );
}