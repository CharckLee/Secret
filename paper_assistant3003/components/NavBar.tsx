import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/', label: '工作台' },
  { href: '/editor', label: '文稿编辑' },
  { href: '/references', label: '参考文献' },
  { href: '/similarity', label: '语义相似自查' },
];

export function NavBar() {
  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="text-lg font-semibold">
          论文写作辅助
        </Link>
        <div className="flex gap-4 text-sm text-gray-600">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-black">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
