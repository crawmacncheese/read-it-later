import Link from "next/link";
import Image from "next/image";

interface Props {
    title: string;
    image: string;
}

const FeatureCard = ({ title, image }: Props) => {
  return (
    <Link href={"/"} id="feature-card">
        <Image src={image} alt={title} width={410} height={300} className="poster"/>
        <p className="title">{title}</p>
    </Link>
  )
}

export default FeatureCard
