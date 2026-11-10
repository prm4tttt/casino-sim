import { Link } from 'react-router-dom';

export default function ComingSoon({ name }: { name: string }) {
  return (
    <div className="panel p-10 text-center">
      <h1 className="text-2xl font-extrabold">{name}</h1>
      <p className="mt-2 text-muted">This game is being built. Check back soon.</p>
      <Link to="/" className="btn-primary mt-6">Back to lobby</Link>
    </div>
  );
}
