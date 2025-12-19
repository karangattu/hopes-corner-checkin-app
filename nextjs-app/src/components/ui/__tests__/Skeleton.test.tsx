import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ListSkeleton,
  CardSkeleton,
  TextSkeleton,
  AvatarSkeleton,
  TableSkeleton,
  FormSkeleton,
  ChartSkeleton,
  SkeletonWrapper,
} from '../Skeleton';

describe('ListSkeleton', () => {
  it('renders default 5 skeleton cards', () => {
    render(<ListSkeleton />);
    const skeletons = screen.getAllByRole('status');
    expect(skeletons).toHaveLength(1); // Container has role="status"
  });

  it('renders custom count of skeleton cards', () => {
    render(<ListSkeleton count={3} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has accessible loading label', () => {
    render(<ListSkeleton />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ListSkeleton className="custom-class" />);
    expect(screen.getByRole('status')).toHaveClass('custom-class');
  });
});

describe('CardSkeleton', () => {
  it('renders with default height', () => {
    render(<CardSkeleton />);
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveStyle({ height: '180px' });
  });

  it('renders with custom height', () => {
    render(<CardSkeleton height={300} />);
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveStyle({ height: '300px' });
  });

  it('applies custom className', () => {
    render(<CardSkeleton className="custom-class" />);
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveClass('custom-class');
  });
});

describe('TextSkeleton', () => {
  it('renders with default width', () => {
    render(<TextSkeleton />);
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveStyle({ width: '100%' });
  });

  it('renders with custom width', () => {
    render(<TextSkeleton width="50%" />);
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveStyle({ width: '50%' });
  });
});

describe('AvatarSkeleton', () => {
  it.each(['sm', 'md', 'lg'] as const)('renders %s size', (size) => {
    render(<AvatarSkeleton size={size} />);
    expect(document.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('applies size-specific classes', () => {
    render(<AvatarSkeleton size="lg" />);
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveClass('w-16', 'h-16');
  });
});

describe('TableSkeleton', () => {
  it('renders default rows and columns', () => {
    render(<TableSkeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has accessible loading label', () => {
    render(<TableSkeleton />);
    expect(screen.getByText('Loading table data...')).toBeInTheDocument();
  });
});

describe('FormSkeleton', () => {
  it('renders default number of fields', () => {
    render(<FormSkeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has accessible loading label', () => {
    render(<FormSkeleton />);
    expect(screen.getByText('Loading form...')).toBeInTheDocument();
  });
});

describe('ChartSkeleton', () => {
  it('renders with default height', () => {
    render(<ChartSkeleton />);
    const skeleton = document.querySelector('[role="status"]');
    expect(skeleton).toHaveStyle({ height: '300px' });
  });

  it('renders with custom height', () => {
    render(<ChartSkeleton height={400} />);
    const skeleton = document.querySelector('[role="status"]');
    expect(skeleton).toHaveStyle({ height: '400px' });
  });

  it('has accessible loading label', () => {
    render(<ChartSkeleton />);
    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
  });
});

describe('SkeletonWrapper', () => {
  it('shows skeleton when loading', () => {
    render(
      <SkeletonWrapper isLoading={true} skeleton={<div>Loading...</div>}>
        <div>Content</div>
      </SkeletonWrapper>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('shows children when not loading', () => {
    render(
      <SkeletonWrapper isLoading={false} skeleton={<div>Loading...</div>}>
        <div>Content</div>
      </SkeletonWrapper>
    );
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
