import { render, screen } from '@testing-library/react';
import { BookmarkCard } from './index';

describe('BookmarkCard', () => {
  const defaultProps = {
    title: 'Example Site',
    url: 'https://example.com',
    description: 'A useful example website',
    tags: ['demo', 'reference'],
  };

  it('renders title and url', () => {
    render(<BookmarkCard {...defaultProps} />);

    expect(screen.getByText('Example Site')).toBeInTheDocument();
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<BookmarkCard {...defaultProps} />);

    expect(
      screen.getByText('A useful example website')
    ).toBeInTheDocument();
  });

  it('renders all tags', () => {
    render(<BookmarkCard {...defaultProps} />);

    expect(screen.getByText('demo')).toBeInTheDocument();
    expect(screen.getByText('reference')).toBeInTheDocument();
  });

  it('hides description when not provided', () => {
    render(<BookmarkCard title="No Desc" url="https://no-desc.com" />);

    expect(screen.queryByText('A useful example website')).toBeNull();
  });

  it('renders without tags when not provided', () => {
    render(<BookmarkCard title="No Tags" url="https://no-tags.com" />);

    const tagsContainer = screen.queryByText('demo');
    expect(tagsContainer).toBeNull();
  });
});
