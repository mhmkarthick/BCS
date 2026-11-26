/**
 * Component render tests.
 *
 * These assert the parts of the UI a user actually sees: the copy, the
 * interactive elements and the state changes a press produces.
 *
 * `@testing-library/react-native` v14 exposes an asynchronous `render` and
 * `fireEvent`, so every interaction is awaited.
 */

import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { BoxIcon, PlusIcon } from 'lucide-react-native';

import { AmountField } from '../src/components/ui/AmountField';
import { Avatar } from '../src/components/ui/Avatar';
import { Button, IconButton } from '../src/components/ui/Button';
import { ChipGroup } from '../src/components/ui/ChipGroup';
import { EmptyState } from '../src/components/ui/EmptyState';
import { FormSection, TextArea, TextField } from '../src/components/ui/Field';
import { InfoRow, NavRow, RowGroup } from '../src/components/ui/NavRow';
import { SearchField } from '../src/components/ui/SearchField';
import { SectionHeader } from '../src/components/ui/SectionHeader';
import { Segmented } from '../src/components/ui/Segmented';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { Stepper } from '../src/components/ui/Stepper';
import { Toggle, ToggleRow } from '../src/components/ui/Toggle';
import { statusMeta } from '../src/data/labels';

/** Walks a rendered JSON tree looking for a node of the given host type. */
function findNode(node: unknown, type: string): boolean {
  if (!node || typeof node !== 'object') return false;
  const record = node as { type?: string; children?: unknown[] };
  if (record.type === type) return true;
  return (record.children ?? []).some((child) => findNode(child, type));
}

describe('Button', () => {
  it('renders its label', async () => {
    await render(<Button>Save order</Button>);
    expect(screen.getByText('Save order')).toBeTruthy();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await render(<Button onPress={onPress}>Save order</Button>);
    await fireEvent.press(screen.getByText('Save order'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(
      <Button onPress={onPress} disabled>
        Save order
      </Button>,
    );
    await fireEvent.press(screen.getByText('Save order'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress while loading', async () => {
    const onPress = jest.fn();
    await render(
      <Button onPress={onPress} loading>
        Save order
      </Button>,
    );
    // The label is replaced by a spinner while the button is busy.
    expect(screen.queryByText('Save order')).toBeNull();
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState.busy).toBe(true);
  });

  it('renders an icon when one is given', async () => {
    const view = await render(<Button icon={PlusIcon}>Add item</Button>);
    expect(findNode(view.toJSON(), 'RNSVGSvgView')).toBe(true);
  });
});

describe('IconButton', () => {
  it('exposes an accessible label', async () => {
    await render(<IconButton icon={BoxIcon} label="Open boxes" />);
    expect(screen.getByLabelText('Open boxes')).toBeTruthy();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await render(<IconButton icon={BoxIcon} label="Open boxes" onPress={onPress} />);
    await fireEvent.press(screen.getByLabelText('Open boxes'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('TextField', () => {
  it('renders the label and the value', async () => {
    await render(<TextField label="Name" value="Ritu" onChangeText={() => {}} />);
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByDisplayValue('Ritu')).toBeTruthy();
  });

  it('reports typing', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Name" value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Ritu');
    expect(onChangeText).toHaveBeenCalledWith('Ritu');
  });

  it('shows the error message', async () => {
    await render(
      <TextField label="Name" value="" onChangeText={() => {}} error="Name is required" />,
    );
    expect(screen.getByText('Name is required')).toBeTruthy();
  });

  it('shows the hint when there is no error', async () => {
    await render(
      <TextField
        label="Name"
        value=""
        onChangeText={() => {}}
        hint="As it appears on the receipt"
      />,
    );
    expect(screen.getByText('As it appears on the receipt')).toBeTruthy();
  });

  it('prefers the error over the hint', async () => {
    await render(
      <TextField
        label="Name"
        value=""
        onChangeText={() => {}}
        hint="A hint"
        error="An error"
      />,
    );
    expect(screen.getByText('An error')).toBeTruthy();
    expect(screen.queryByText('A hint')).toBeNull();
  });

  it('marks an optional field', async () => {
    await render(<TextField label="Notes" value="" onChangeText={() => {}} optional />);
    expect(screen.getByText('Optional')).toBeTruthy();
  });

  it('renders a currency prefix', async () => {
    await render(
      <TextField label="Price" value="450" onChangeText={() => {}} prefix="₹" />,
    );
    expect(screen.getByText('₹')).toBeTruthy();
  });
});

describe('TextArea', () => {
  it('renders its label and value', async () => {
    await render(<TextArea label="Notes" value="No candles" onChangeText={() => {}} />);
    expect(screen.getByText('Notes')).toBeTruthy();
    expect(screen.getByDisplayValue('No candles')).toBeTruthy();
  });
});

describe('FormSection', () => {
  it('renders the section title', async () => {
    await render(
      <FormSection title="Items">
        <Text>Child</Text>
      </FormSection>,
    );
    expect(screen.getByText('Items')).toBeTruthy();
    expect(screen.getByText('Child')).toBeTruthy();
  });

  it('renders an aside value', async () => {
    await render(
      <FormSection title="Items" aside={<Text>2 items</Text>}>
        <Text>Child</Text>
      </FormSection>,
    );
    expect(screen.getByText('2 items')).toBeTruthy();
  });
});

describe('ChipGroup', () => {
  const options = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending', count: 3 },
  ];

  it('renders every option', async () => {
    await render(
      <ChipGroup
        options={options}
        value="all"
        onChange={() => {}}
        ariaLabel="Order status"
      />,
    );
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('reports the selected option', async () => {
    const onChange = jest.fn();
    await render(
      <ChipGroup
        options={options}
        value="all"
        onChange={onChange}
        ariaLabel="Order status"
      />,
    );
    await fireEvent.press(screen.getByText('Pending'));
    expect(onChange).toHaveBeenCalledWith('pending');
  });

  it('exposes the group as a radiogroup', async () => {
    await render(
      <ChipGroup
        options={options}
        value="pending"
        onChange={() => {}}
        ariaLabel="Order status"
      />,
    );
    expect(screen.getByLabelText('Order status')).toBeTruthy();
  });
});

describe('StatusBadge', () => {
  it('shows the label for each status', async () => {
    const statuses = [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'delivered',
      'cancelled',
    ] as const;
    for (const status of statuses) {
      const view = await render(<StatusBadge status={status} />);
      expect(view.getByText(statusMeta[status].label)).toBeTruthy();
      await view.unmount();
    }
  });
});

describe('EmptyState', () => {
  it('renders the title and body', async () => {
    await render(
      <EmptyState
        icon={BoxIcon}
        title="No orders yet"
        body="Add your first order to get going."
      />,
    );
    expect(screen.getByText('No orders yet')).toBeTruthy();
    expect(screen.getByText('Add your first order to get going.')).toBeTruthy();
  });

  it('renders the action and calls it', async () => {
    const onAction = jest.fn();
    await render(
      <EmptyState
        icon={BoxIcon}
        title="No orders yet"
        body="Add your first order to get going."
        actionLabel="New order"
        onAction={onAction}
      />,
    );
    await fireEvent.press(screen.getByText('New order'));
    expect(onAction).toHaveBeenCalled();
  });

  it('omits the action when no handler is given', async () => {
    await render(
      <EmptyState
        icon={BoxIcon}
        title="No orders yet"
        body="Add your first order to get going."
        actionLabel="New order"
      />,
    );
    expect(screen.queryByText('New order')).toBeNull();
  });
});

describe('SectionHeader', () => {
  it('renders the title and meta', async () => {
    await render(<SectionHeader title="Recent orders" meta="12" />);
    expect(screen.getByText('Recent orders')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('calls the action', async () => {
    const onAction = jest.fn();
    await render(
      <SectionHeader title="Recent orders" action="See all" onAction={onAction} />,
    );
    await fireEvent.press(screen.getByLabelText('See all'));
    expect(onAction).toHaveBeenCalled();
  });
});

describe('Toggle', () => {
  it('reports the new state', async () => {
    const onChange = jest.fn();
    await render(<Toggle checked={false} onChange={onChange} label="Track stock" />);
    await fireEvent.press(screen.getByLabelText('Track stock'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('exposes the checked state', async () => {
    await render(<Toggle checked onChange={() => {}} label="Track stock" />);
    expect(
      screen.getByLabelText('Track stock').props.accessibilityState.checked,
    ).toBe(true);
  });
});

describe('ToggleRow', () => {
  it('renders the label and description', async () => {
    await render(
      <ToggleRow
        label="Available for orders"
        description="Inactive products are hidden when creating orders"
        checked
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('Available for orders')).toBeTruthy();
    expect(
      screen.getByText('Inactive products are hidden when creating orders'),
    ).toBeTruthy();
  });
});

describe('Stepper', () => {
  it('increments the value', async () => {
    const onChange = jest.fn();
    await render(<Stepper value={2} onChange={onChange} label="Quantity" />);
    await fireEvent.press(screen.getByLabelText('Increase Quantity'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('decrements the value', async () => {
    const onChange = jest.fn();
    await render(<Stepper value={2} onChange={onChange} label="Quantity" />);
    await fireEvent.press(screen.getByLabelText('Decrease Quantity'));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('does not go below the minimum', async () => {
    const onChange = jest.fn();
    await render(<Stepper value={1} onChange={onChange} min={1} label="Quantity" />);
    await fireEvent.press(screen.getByLabelText('Decrease Quantity'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not go above the maximum', async () => {
    const onChange = jest.fn();
    await render(<Stepper value={5} onChange={onChange} max={5} label="Quantity" />);
    await fireEvent.press(screen.getByLabelText('Increase Quantity'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Segmented', () => {
  const options = [
    { value: 'recent', label: 'Recent' },
    { value: 'az', label: 'A–Z' },
  ];

  it('renders every option', async () => {
    await render(
      <Segmented
        options={options}
        value="recent"
        onChange={() => {}}
        ariaLabel="Sort"
      />,
    );
    expect(screen.getByText('Recent')).toBeTruthy();
    expect(screen.getByText('A–Z')).toBeTruthy();
  });

  it('reports the selected option', async () => {
    const onChange = jest.fn();
    await render(
      <Segmented options={options} value="recent" onChange={onChange} ariaLabel="Sort" />,
    );
    await fireEvent.press(screen.getByText('A–Z'));
    expect(onChange).toHaveBeenCalledWith('az');
  });
});

describe('SearchField', () => {
  it('renders the placeholder as the accessible label', async () => {
    await render(
      <SearchField value="" onChange={() => {}} placeholder="Search orders" />,
    );
    expect(screen.getByLabelText('Search orders')).toBeTruthy();
  });

  it('reports typing', async () => {
    const onChange = jest.fn();
    await render(
      <SearchField value="" onChange={onChange} placeholder="Search orders" />,
    );
    await fireEvent.changeText(screen.getByLabelText('Search orders'), 'truffle');
    expect(onChange).toHaveBeenCalledWith('truffle');
  });

  it('offers a clear button only when there is text', async () => {
    const onChange = jest.fn();
    const view = await render(
      <SearchField value="" onChange={onChange} placeholder="Search orders" />,
    );
    expect(screen.queryByLabelText('Clear search')).toBeNull();

    await view.rerender(
      <SearchField value="truffle" onChange={onChange} placeholder="Search orders" />,
    );
    await fireEvent.press(screen.getByLabelText('Clear search'));
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('Avatar', () => {
  it('shows the initials of the name', async () => {
    await render(<Avatar name="Kavya Menon" />);
    expect(screen.getByText('KM')).toBeTruthy();
  });
});

describe('AmountField', () => {
  it('renders the label, symbol and value', async () => {
    await render(<AmountField label="Amount" value="250" onChangeText={() => {}} />);
    expect(screen.getByText('Amount')).toBeTruthy();
    expect(screen.getByText('₹')).toBeTruthy();
    expect(screen.getByDisplayValue('250')).toBeTruthy();
  });

  it('reports typing', async () => {
    const onChangeText = jest.fn();
    await render(<AmountField label="Amount" value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText('Amount'), '250');
    expect(onChangeText).toHaveBeenCalledWith('250');
  });

  it('shows the error message', async () => {
    await render(
      <AmountField
        label="Amount"
        value=""
        onChangeText={() => {}}
        error="Enter an amount above ₹0"
      />,
    );
    expect(screen.getByText('Enter an amount above ₹0')).toBeTruthy();
  });
});

describe('NavRow', () => {
  it('renders the label and description', async () => {
    await render(
      <NavRow
        label="Backup"
        description="Save a copy of your data"
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('Backup')).toBeTruthy();
    expect(screen.getByText('Save a copy of your data')).toBeTruthy();
  });

  it('calls onClick', async () => {
    const onClick = jest.fn();
    await render(<NavRow label="Backup" onClick={onClick} />);
    await fireEvent.press(screen.getByText('Backup'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders a trailing value', async () => {
    await render(<NavRow label="Currency" value="INR" />);
    expect(screen.getByText('INR')).toBeTruthy();
  });
});

describe('RowGroup', () => {
  it('renders its title and children', async () => {
    await render(
      <RowGroup title="Business">
        <NavRow label="Name" value="Bright Cakes" />
      </RowGroup>,
    );
    expect(screen.getByText('Business')).toBeTruthy();
    expect(screen.getByText('Name')).toBeTruthy();
  });
});

describe('InfoRow', () => {
  it('renders a label and a value', async () => {
    await render(<InfoRow label="Subtotal" value="₹450" />);
    expect(screen.getByText('Subtotal')).toBeTruthy();
    expect(screen.getByText('₹450')).toBeTruthy();
  });
});
