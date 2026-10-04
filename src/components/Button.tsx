import type { AnchorHTMLAttributes, ButtonHTMLAttributes, FC } from "react";
import { cx } from "../../utils/cx";

type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button: FC<ButtonProps> = ({
  variant = "primary",
  className,
  type = "button",
  ...props
}) => (
  <button
    type={type}
    className={cx(
      "rdv-button",
      variant === "secondary" && "rdv-button--secondary",
      className,
    )}
    {...props}
  />
);

export const ButtonPrimary: FC<ButtonProps> = (props) => (
  <Button variant="primary" {...props} />
);

export const ButtonSecondary: FC<ButtonProps> = (props) => (
  <Button variant="secondary" {...props} />
);

export type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement>;

export const LinkButton: FC<LinkButtonProps> = ({ className, ...props }) => (
  <a className={cx("rdv-button", "rdv-link-button", className)} {...props} />
);
