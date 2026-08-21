import {
  Check,
  Layers,
  LoaderCircle,
  MessageCircle,
  PlugZap,
  Plus,
  QrCode,
  RefreshCw,
  Send,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-angular';

export const WHATSAPP_ICONS = {
  whatsapp: MessageCircle,
  refresh: RefreshCw,
  loader: LoaderCircle,
  send: Send,
  check: Check,
  alert: TriangleAlert,
  x: X,
  plugZap: PlugZap,
  qrCode: QrCode,
  plus: Plus,
  trash: Trash2,
  layers: Layers,
} as const;
