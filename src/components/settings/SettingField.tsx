import { Form } from "@raycast/api";
import type { ScalarSetting } from "../../settings/types";

export function SettingField({
  setting,
  value,
  error,
  onChange,
  onBlur,
}: {
  setting: ScalarSetting;
  value: string | boolean;
  error?: string;
  onChange: (value: string | boolean) => void;
  onBlur: () => void;
}) {
  const shared = { id: setting.path, title: setting.name, info: setting.description, error, onBlur };
  if (setting.kind === "boolean")
    return <Form.Checkbox {...shared} label={setting.name} value={value === true} onChange={onChange} />;
  if (setting.kind === "select") {
    const options = setting.options.some((option) => option.value === value)
      ? setting.options
      : [{ value: String(value), label: String(value) || "(empty)" }, ...setting.options];
    return (
      <Form.Dropdown {...shared} value={String(value)} onChange={onChange}>
        {options.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.label} />
        ))}
      </Form.Dropdown>
    );
  }
  return <Form.TextField {...shared} value={String(value)} onChange={onChange} />;
}
