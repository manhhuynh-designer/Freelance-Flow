'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  MessageCircle, 
  Zap, 
  TrendingUp, 
  Briefcase,
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/dashboard-context';

export function AIHubQuickAccess() {
  const router = useRouter();

  const { T } = useDashboard() as any;

  const features = [
    { icon: MessageCircle, title: T?.aiChat || 'AI Chat', desc: 'Conversation with AI' },
    { icon: Zap, title: T?.predictionsTab || T?.predictions || 'Productivity', desc: 'Forecasting & insights' },
    { icon: Briefcase, title: T?.business || 'Business Intel', desc: 'Analytics & metrics' },
    { icon: TrendingUp, title: T?.patternAnalysis || 'Pattern Analysis', desc: 'Behavioral insights' }
  ];

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-green-500/10"></div>
      <CardHeader className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            {T.aiHub}
          </Badge>
        </div>
        <CardTitle className="text-xl">AI Assistant Intelligence</CardTitle>
        <CardDescription>
          Unified AI experience - Chat, predictions, analytics & more in one place
        </CardDescription>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {/* Quick Features */}
        <div className="grid grid-cols-2 gap-2">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <feature.icon className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium">{feature.title}</p>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <Button 
          onClick={() => router.push('/dashboard/ai-assistant')}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white gap-2"
        >
          Open {T.aiHub}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
