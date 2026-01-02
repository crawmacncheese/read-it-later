import FeatureCard from "@/components/FeatureCard"
import LoginBtn from "@/components/LoginBtn"

const features = [
  { image: '/images/event1.png', title: "feature 1"},
  { image: '/images/event2.png', title: "feature 2"},
  { image: '/images/event3.png', title: "feature 3"},
  { image: '/images/event4.png', title: "feature 4"},
]

const Home = () => {
  return (
    <section>
      <h1 className="text-center">Read It Later</h1>
      <p className="text-center mt5">Read Save Pages - Anytime, Anywhere</p>
      <LoginBtn/>
      <div className="mt-20 space-y-7">
        <h3>Features</h3>
        
        <ul className="features">
          {features.map((feature) => (
            <li key={feature.title}>
              <FeatureCard {...feature}/>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default Home
