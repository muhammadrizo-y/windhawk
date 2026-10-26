import { Action, ActionPanel, Alert, Color, confirmAlert, Form, Icon, Keyboard, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { setModSettings } from "../utils/actions";
import { getStringListValues } from "../utils/mods";
import { ElevatedAction } from "./ElevatedAction";

/**
 * Manages a primitive (string) list setting — e.g. `buttons[1].Action` —
 * the same way ManageRules manages rule lists: one List row per stored
 * entry, edits written as `path[i]=value` pairs, and a refresh-from-truth
 * after every mutation so display numbers stay dense while storage
 * indices (blank entries included) drive the writes.
 */
export default function ManageStringList({
  modId,
  path,
  name,
  entries,
  onReplaced,
}: {
  modId: string;
  path: string;
  name: string;
  entries: string[];
  onReplaced: (entries: string[]) => void;
}) {
  const doRefresh = async () => {
    onReplaced(await getStringListValues(modId, path));
  };

  // Sync once on open: the pushed entries may lag behind storage.
  useEffect(() => {
    void doRefresh();
  }, []);

  const firstEmpty = entries.findIndex((entry) => entry.trim() === "");
  const newIndex = firstEmpty === -1 ? entries.length : firstEmpty;
  const visible = entries
    .map((entry, storageIndex) => ({ entry, storageIndex }))
    .filter(({ entry }) => entry.trim() !== "");

  return (
    <List navigationTitle={`${name} — Entries`} searchBarPlaceholder="Search entries…" isShowingDetail>
      {visible.map(({ entry, storageIndex }, displayIndex) => (
        <EntryRow
          key={storageIndex}
          modId={modId}
          path={path}
          name={name}
          entry={entry}
          storageIndex={storageIndex}
          displayNumber={displayIndex + 1}
          newIndex={newIndex}
          total={entries.length}
          onRefreshed={doRefresh}
        />
      ))}
      {visible.length === 0 && (
        <List.Item
          icon={Icon.Plus}
          title="No entries"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="New Entry"
                target={
                  <EntryForm modId={modId} path={path} storageIndex={newIndex} name={name} initial="" onSaved={doRefresh} />
                }
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function EntryRow({
  modId,
  path,
  name,
  entry,
  storageIndex,
  displayNumber,
  newIndex,
  total,
  onRefreshed,
}: {
  modId: string;
  path: string;
  name: string;
  entry: string;
  storageIndex: number;
  displayNumber: number;
  newIndex: number;
  total: number;
  onRefreshed: () => Promise<void>;
}) {
  const blankPairs = Array.from({ length: total }, (_, index) => ({ key: `${path}[${index}]`, value: "" }));

  return (
    <List.Item
      title={entry}
      detail={<List.Item.Detail markdown={`## Entry ${displayNumber}\n\n${entry}`} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Pencil}
              title="Edit Entry"
              target={
                <EntryForm
                  modId={modId}
                  path={path}
                  storageIndex={storageIndex}
                  displayNumber={displayNumber}
                  name={name}
                  initial={entry}
                  isEntry
                  onSaved={onRefreshed}
                />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Plus}
              title="New Entry"
              target={
                <EntryForm
                  modId={modId}
                  path={path}
                  storageIndex={newIndex}
                  name={name}
                  initial=""
                  onSaved={onRefreshed}
                />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {storageIndex > 0 ? (
              <ElevatedAction
                icon={Icon.Trash}
                title="Remove Entry"
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  if (
                    !(await confirmAlert({
                      icon: { source: Icon.Trash, tintColor: Color.Red },
                      title: `Remove Entry ${displayNumber}?`,
                      message: entry,
                      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                    }))
                  ) {
                    return;
                  }
                  if (await setModSettings(modId, [{ key: `${path}[${storageIndex}]`, value: "" }])) {
                    await onRefreshed();
                  }
                }}
              />
            ) : undefined}
            <ElevatedAction
              icon={Icon.Trash}
              title="Remove All Entries"
              style={Action.Style.Destructive}
              onAction={async () => {
                if (
                  !(await confirmAlert({
                    icon: { source: Icon.Trash, tintColor: Color.Red },
                    title: "Remove All Entries?",
                    message: "Every entry will be cleared. One empty slot is kept, as Windhawk requires it.",
                    primaryAction: { title: "Remove All", style: Alert.ActionStyle.Destructive },
                  }))
                ) {
                  return;
                }
                if (await setModSettings(modId, blankPairs)) {
                  await onRefreshed();
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function EntryForm({
  modId,
  path,
  storageIndex,
  displayNumber,
  name,
  initial,
  isEntry = false,
  onSaved,
}: {
  modId: string;
  path: string;
  storageIndex: number;
  displayNumber?: number;
  name: string;
  initial: string;
  isEntry?: boolean;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState(initial);

  return (
    <Form
      navigationTitle={isEntry ? `Edit Entry ${displayNumber ?? storageIndex + 1}` : `New ${name} Entry`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEntry ? "Save Entry" : "Add Entry"}
            onSubmit={async () => {
              if (!isEntry && !value.trim()) return false;
              if (await setModSettings(modId, [{ key: `${path}[${storageIndex}]`, value }])) {
                await onSaved();
                return;
              }
              return false;
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="entry"
        title={name}
        value={value}
        onChange={setValue}
        info="One entry. Each line of the list becomes one entry when stored — manage additional entries with the list actions."
      />
    </Form>
  );
}
