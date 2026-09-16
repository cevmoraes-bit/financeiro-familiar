import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Paperclip, Upload, Download, FileText, Receipt, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { uploadReceipt, getReceiptUrl, deleteReceipt } from '@/lib/receipts';
import { Transaction } from '@/lib/transactions';

interface TransactionAttachmentsProps {
  transaction: Transaction;
  onUpdated: () => void;
}

const fileNameFromPath = (path: string) => path.split('/').pop() || path;

const downloadFile = async (path: string) => {
  const url = await getReceiptUrl(path);
  if (!url) {
    toast.error('Não foi possível abrir o arquivo');
    return;
  }
  const response = await fetch(url);
  if (!response.ok) {
    toast.error('Não foi possível baixar o arquivo');
    return;
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileNameFromPath(path);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

const AttachmentSlot = ({
  icon,
  label,
  hint,
  path,
  onUpload,
  onRemove,
  uploading,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  path: string | null | undefined;
  onUpload: (file: File) => void;
  onRemove: () => void;
  uploading: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>

      {path ? (
        <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-2.5 py-2">
          <span className="text-xs text-foreground truncate">{fileNameFromPath(path)}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer"
              title="Baixar"
              onClick={() => downloadFile(path)}
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-destructive"
              title="Remover"
              onClick={onRemove}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full cursor-pointer"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          {uploading ? 'Enviando...' : 'Enviar arquivo'}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
};

const TransactionAttachments = ({ transaction, onUpdated }: TransactionAttachmentsProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  const hasAny = !!transaction.attachment_url || !!transaction.payment_proof_url;

  const handleUpload = async (
    file: File,
    field: 'attachment_url' | 'payment_proof_url',
    folder: string,
    setUploading: (v: boolean) => void
  ) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = await uploadReceipt(user.id, file, folder);
      const { error } = await supabase.from('transactions').update({ [field]: path }).eq('id', transaction.id);
      if (error) throw error;
      toast.success('Arquivo enviado');
      onUpdated();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar arquivo';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (field: 'attachment_url' | 'payment_proof_url', path: string | null | undefined) => {
    try {
      const { error } = await supabase.from('transactions').update({ [field]: null }).eq('id', transaction.id);
      if (error) throw error;
      if (path) await deleteReceipt(path).catch(() => {});
      toast.success('Arquivo removido');
      onUpdated();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover arquivo';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 cursor-pointer ${hasAny ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        title="Documentos e comprovante"
        onClick={() => setOpen(true)}
      >
        <Paperclip className="w-3.5 h-3.5" />
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Documentos da transação</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <AttachmentSlot
            icon={<FileText className="w-4 h-4 text-primary flex-shrink-0" />}
            label="Documento (boleto / nota)"
            hint="O documento original a ser pago"
            path={transaction.attachment_url}
            uploading={uploadingDoc}
            onUpload={(file) => handleUpload(file, 'attachment_url', 'documents', setUploadingDoc)}
            onRemove={() => handleRemove('attachment_url', transaction.attachment_url)}
          />
          <AttachmentSlot
            icon={<Receipt className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
            label="Comprovante de pagamento"
            hint="O comprovante de que o pagamento foi feito"
            path={transaction.payment_proof_url}
            uploading={uploadingProof}
            onUpload={(file) => handleUpload(file, 'payment_proof_url', 'proofs', setUploadingProof)}
            onRemove={() => handleRemove('payment_proof_url', transaction.payment_proof_url)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionAttachments;
