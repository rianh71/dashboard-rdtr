import { Link2, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface ShareViewButtonProps {
  label?: string;
}

export function ShareViewButton({ label = 'Share View' }: ShareViewButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: 'Link disalin', description: 'URL dengan filter aktif berhasil disalin ke clipboard.' });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: 'Gagal menyalin', description: 'Browser tidak mengizinkan akses clipboard.', variant: 'destructive' });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="gap-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      title="Salin URL dashboard dengan filter aktif"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Link2 className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{copied ? 'Tersalin' : label}</span>
    </Button>
  );
}
