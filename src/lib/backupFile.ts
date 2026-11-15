import { isNativeApp } from './native';

export async function saveBackupFile(
  fileName: string,
  contents: string,
): Promise<void> {
  if (!isNativeApp()) {
    const blob = new Blob([contents], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    return;
  }

  const [{ Directory, Encoding, Filesystem }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);

  const result = await Filesystem.writeFile({
    path: fileName,
    data: contents,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  await Share.share({
    title: 'Respaldo de Rotación de Circuitos',
    url: result.uri,
    dialogTitle: 'Guardar o compartir respaldo',
  });
}
