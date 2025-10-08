export default function Footer() {
  return (
    <footer id="contact" className="border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-10 text-center text-white/75">
        Interested in partnership or acquisition?{" "}
        <a
          className="underline decoration-emerald-400/70 underline-offset-4 hover:text-white"
          href="mailto:founders@simetrix.ai"
        >
          founders@simetrix.ai
        </a>
        <div className="mt-2 text-xs text-white/60">Salt Lake City • Built in USA</div>
      </div>
    </footer>
  );
}
