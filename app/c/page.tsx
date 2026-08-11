import PublicCardPage from './[slug]/page';

export default async function CardIndexPage() {
  return <PublicCardPage params={Promise.resolve({ slug: 'demo-card' })} />;
}
