import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-black border border-slate-800 hover:border-purple-500/50 transition-all duration-300 group">
      <div className="p-6 sm:p-8 flex items-start gap-6">
        <div className="w-12 h-12 border border-slate-800 group-hover:border-purple-500 flex items-center justify-center flex-shrink-0 transition-colors">
          <Icon className="w-6 h-6 text-slate-600 group-hover:text-purple-500 transition-colors" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-light text-slate-200 group-hover:text-purple-400 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}