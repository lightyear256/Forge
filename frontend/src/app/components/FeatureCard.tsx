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
      color="purple"
      speed="5s"
      thickness={1}
    >
      <div className="flex flex-col items-start text-left group h-full bg-black p-6 sm:p-8">
        <div className="w-12 h-12 border border-slate-800 group-hover:border-purple-500 flex items-center justify-center mb-4 transition-colors">
          <Icon className="w-6 h-6 text-slate-600 group-hover:text-purple-500 transition-colors" />
        </div>
        <h3 className="text-xl font-light mb-2 text-slate-200 group-hover:text-purple-400 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors leading-relaxed">
          {description}
        </p>
      </div>
    </StarBorder>
  );
}