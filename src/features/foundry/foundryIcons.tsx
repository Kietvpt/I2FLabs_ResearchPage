import {
  BarChart3,
  Cpu,
  FileText,
  FlaskConical,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Palette,
  RefreshCw,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sigma,
  Wrench,
} from 'lucide-react';
import type { CompetencyAxis, VentureStage } from '@/types/database';

export function StageIcon({
  stage,
  className = 'w-3.5 h-3.5',
}: {
  stage: VentureStage;
  className?: string;
}) {
  switch (stage) {
    case 'vibe_spark':
      return <Lightbulb className={className} />;
    case 'deep_rdd':
      return <FlaskConical className={className} />;
    case 'prototype_mvp':
      return <Wrench className={className} />;
    case 'unikorn_live':
      return <Rocket className={className} />;
    case 'research_loop':
      return <RefreshCw className={className} />;
  }
}

export function CompetencyAxisIcon({
  axis,
  className = 'w-3.5 h-3.5',
}: {
  axis: CompetencyAxis;
  className?: string;
}) {
  switch (axis) {
    case 'algorithm':
      return <Sigma className={className} />;
    case 'systems':
      return <Cpu className={className} />;
    case 'product_ux':
      return <Palette className={className} />;
    case 'fmea_safety':
      return <ShieldCheck className={className} />;
    case 'unikorn_growth':
      return <Rocket className={className} />;
  }
}

export function NodeTypeIcon({
  nodeType,
  className = 'w-3.5 h-3.5',
}: {
  nodeType: string;
  className?: string;
}) {
  switch (nodeType) {
    case 'question':
      return <HelpCircle className={className} />;
    case 'hypothesis':
      return <Lightbulb className={className} />;
    case 'formal_proof':
      return <Sigma className={className} />;
    case 'specification':
      return <FileText className={className} />;
    case 'empirical_poc':
      return <FlaskConical className={className} />;
    case 'benchmark':
      return <BarChart3 className={className} />;
    case 'failure_mode':
      return <ShieldAlert className={className} />;
    default:
      return <MessageSquare className={className} />;
  }
}
