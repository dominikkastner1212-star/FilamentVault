import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

type QrCodeProps = {
  value: string;
  label: string;
};

export function QrCode({ value, label }: QrCodeProps) {
  const [source, setSource] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      margin: 1,
      width: 196,
      color: {
        dark: '#101417',
        light: '#f8faf9'
      }
    })
      .then((result) => {
        if (active) {
          setSource(result);
          setError(null);
        }
      })
      .catch((qrError) => {
        if (active) {
          setError(qrError instanceof Error ? qrError.message : 'QR-Code konnte nicht erzeugt werden.');
        }
      });

    return () => {
      active = false;
    };
  }, [value]);

  if (error) {
    return <div className="qr-fallback">{error}</div>;
  }

  return (
    <figure className="qr-code">
      {source ? <img src={source} alt={label} /> : <div className="qr-loading" />}
      <figcaption>{value}</figcaption>
    </figure>
  );
}
