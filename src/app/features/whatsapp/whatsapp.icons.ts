import {
  Check,
  LoaderCircle,
  MessageCircle,
  PlugZap,
  QrCode,
  RefreshCw,
  Send,
  X,
} from 'lucide-angular';

export const WHATSAPP_ICONS = {
  whatsapp: MessageCircle,
  refresh: RefreshCw,
  loader: LoaderCircle,
  send: Send,
  check: Check,
  x: X,
  plugZap: PlugZap,
  qrCode: QrCode,
} as const;
