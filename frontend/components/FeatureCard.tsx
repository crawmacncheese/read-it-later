'use client';
import Link from "next/link";
import Image from "next/image";
import posthog from "posthog-js";

interface Props {
    title: string;
    image: string;
}

const FeatureCard = ({ title, image }: Props) => {
  const handleClick = () => {
    posthog.capture('feature_card_clicked', {
      feature_title: title,
      feature_image: image,
      location: 'homepage_features_section',
    });
  };

  return (
    <Link href={"/"} id="feature-card" onClick={handleClick}>
        <Image src={image} alt={title} width={410} height={300} className="poster"/>
        <p className="title">{title}</p>
    </Link>
  )
}

export default FeatureCard
