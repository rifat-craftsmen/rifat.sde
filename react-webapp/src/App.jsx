import Navbar from './components/Navbar';
import './App.css';

function App() {
  return (
    <>
      <header>
        <div className="container">
          <Navbar />
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section id="home" aria-labelledby="hero-heading">
          <div className="container">
            <h2 id="hero-heading">Welcome to this simple page</h2>
            <p>
              This is a single-page React application built with semantic HTML,
              proper landmarks, and basic accessibility in mind.
            </p>
          </div>
        </section>

        {/* Flexbox section */}
        <section id="flex" aria-labelledby="flex-heading">
          <div className="container">
            <h2 id="flex-heading">Flexbox Example</h2>
            
            <div className="flex-container">
              <div className="card">
                <h3>Feature A</h3>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
              </div>
              <div className="card">
                <h3>Feature B</h3>
                <p>Sed do eiusmod tempor incididunt ut labore et dolore magna.</p>
              </div>
              <div className="card">
                <h3>Feature C</h3>
                <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco.</p>
              </div>
              <div className="card">
                <h3>Feature D</h3>
                <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco.</p>
              </div>
              <div className="card">
                <h3>Feature E</h3>
                <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco.</p>
              </div>
              <div className="card">
                <h3>Feature F</h3>
                <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Grid section */}
        <section id="grid" aria-labelledby="grid-heading">
          <div className="container">
            <h2 id="grid-heading">CSS Grid Example</h2>
            
            <div className="grid-container">
              <div className="grid-item item-a">Item A</div>
              <div className="grid-item item-b">Item B</div>
              <div className="grid-item item-c">Item C</div>
              <div className="grid-item item-d">Item D</div>
              <div className="grid-item item-e">Item E</div>
              <div className="grid-item item-f">Item F</div>
            </div>
          </div>
        </section>
      </main>

      <footer id="contact">
        <div className="container">
          <p>© {new Date().getFullYear()} Simple React Page • Made with accessibility in mind</p>
        </div>
      </footer>
    </>
  );
}

export default App;