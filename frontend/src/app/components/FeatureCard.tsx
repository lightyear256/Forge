import { LucideIcon } from 'lucide-react';
import StarBorder from './starBorder';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <StarBorder
      as="div"
      className="w-full h-full transition-all duration-300 transform hover:scale-105"
      color="magenta"
      speed="5s"
      thickness={2}
    >
      <div className="flex flex-col items-start text-left group h-full">
        <Icon className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 text-gray-300 transition-colors" />
        <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-white">
          {title}
        </h3>
        <p className="text-sm sm:text-base text-gray-400 group-hover:text-gray-300 transition-colors">
          {description}
        </p>
      </div>
    </StarBorder>
  );
}