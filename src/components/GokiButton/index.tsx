import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
import { ConnectWalletButton } from '@gokiprotocol/walletkit';
import { createLocalStorageStateHook } from 'use-local-storage-state';
import { DISALLOWED_COUNTRIES, useCountry } from '../../hooks/useCountry';
import Disclaimer from '../Disclaimer';

export const useDisclaimerState = createLocalStorageStateHook('hasAcceptedDisclaimer', false);

const useStyles = makeStyles(() => ({
  gokiButton: {
    zIndex: 1,
  },
  disclaimerButtonContainer: {
    position: 'relative',
    zIndex: 1
  },
  disclaimerButton: {
    bottom: 0,
    cursor: 'pointer',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 99
  }
}));

const GokiButton: React.VFC = () => {
  const styles = useStyles();
  const countryCode = useCountry();
  const [isProhibited, setIsProhibited] = useState(false);

  const [
    hasAcceptedDisclaimer
    // , setHasAcceptedDisclaimer
  ] = useDisclaimerState();
  const [showDisclaimer, setDisclaimerVisible] = useState(false);

  const handleGeoCheck = () => {
    if (DISALLOWED_COUNTRIES.includes(countryCode ?? '')) {
      return setIsProhibited(true);
    }
    if (hasAcceptedDisclaimer) {
      let element: HTMLElement = document.querySelector('#temp-solution-2m00n') as HTMLElement;
      return element.click();
    }
    setDisclaimerVisible(true);
  };

  return (
    <>
      <div className={styles.disclaimerButtonContainer}>
        {/* Workarounds re Goki callbacks (coming soon?) */}
        <ConnectWalletButton id='temp-solution-2m00n' />
        <div className={styles.disclaimerButton} onClick={handleGeoCheck}></div>
      </div>
      {
        (showDisclaimer) ? <Disclaimer /> : null
      }
      {
        (isProhibited) ? <Redirect to='/prohibited-jurisdiction' /> : null
      }
    </>
  );
};

export default GokiButton;
