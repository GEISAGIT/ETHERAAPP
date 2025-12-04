'use client';

import { useState } from 'react';
import { useStorage, useUser } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud } from 'lucide-react';
import Image from 'next/image';

export function UploadClient() {
  const { user } = useUser();
  const storage = useStorage();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
      setUploadedImageUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !user || !storage) {
      toast({
        variant: 'destructive',
        title: 'Erro de Pré-requisito',
        description: 'Por favor, selecione um arquivo e certifique-se de que está logado.',
      });
      return;
    }

    setIsUploading(true);
    setUploadedImageUrl(null);

    const storageRef = ref(storage, `uploads/${user.uid}/${file.name}`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setUploadedImageUrl(downloadURL);
      toast({
        title: 'Sucesso!',
        description: 'Sua imagem foi enviada.',
      });
    } catch (error: any) {
      console.error("Erro no upload da imagem:", error);
      toast({
        variant: 'destructive',
        title: 'Erro no Upload',
        description: error.message || 'Ocorreu um erro inesperado ao fazer o upload. Verifique as regras de CORS e do Storage.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Upload de Imagem</h1>
        <p className="text-muted-foreground">Envie um arquivo para o Firebase Storage.</p>
      </header>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Selecione uma Imagem</CardTitle>
          <CardDescription>Escolha um arquivo de imagem do seu computador para enviar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image-upload">Arquivo de Imagem</Label>
            <Input id="image-upload" type="file" onChange={handleFileChange} accept="image/png, image/jpeg, image/gif" />
          </div>
          <Button onClick={handleUpload} disabled={isUploading || !file}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Enviar Imagem
          </Button>

          {isUploading && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Enviando...</span>
            </div>
          )}

          {uploadedImageUrl && (
            <div className="space-y-4 pt-4">
                <h3 className="font-medium">Imagem Enviada:</h3>
                <div className="relative aspect-video w-full overflow-hidden rounded-md border">
                    <Image src={uploadedImageUrl} alt="Imagem enviada" fill objectFit="contain" />
                </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
