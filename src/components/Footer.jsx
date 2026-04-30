import React from 'react';

const Footer = () => {
  return (
    <footer className="mt-auto border-t border-rosewood/10 bg-cream/50 py-2 text-center">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-xs uppercase tracking-widest text-rosewood/60">
          &copy; {new Date().getFullYear()} Karter inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;