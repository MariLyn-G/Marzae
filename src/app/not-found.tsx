import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="wrap page">
      <div className="kicker">Not found</div>
      <h1 className="h1-page">Nothing was cut to this pattern.</h1>
      <Link className="btn btn-primary btn-md" href="/shop">Back to the collection</Link>
    </section>
  );
}
