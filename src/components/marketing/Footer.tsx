import React from "react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="mx-auto max-w-7xl px-6 md:px-8 py-10 text-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>© {year} Simetrix. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="/docs">Docs</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
