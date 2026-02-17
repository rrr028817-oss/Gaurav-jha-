
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect } from 'react';

interface AdUnitProps {
  slot?: string;
  style?: React.CSSProperties;
  className?: string;
}

const AdUnit: React.FC<AdUnitProps> = ({ 
  slot = "7122612707", 
  style = { display: 'block' },
  className = "" 
}) => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("Adsbygoogle error:", e);
    }
  }, []);

  return (
    <div className={`ad-container ${className}`} style={{ minHeight: '100px', margin: '15px 0', overflow: 'hidden' }}>
      <ins className="adsbygoogle"
           style={style}
           data-ad-client="ca-pub-2165955269601695"
           data-ad-slot={slot}
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  );
};

export default AdUnit;
