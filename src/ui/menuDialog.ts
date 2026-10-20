export type MenuDialog = {
    dialog: HTMLDialogElement;
    content: HTMLDivElement;
};

export function createMenuDialog(
    id: string,
    title: string,
    description: string
): MenuDialog {
    const dialog = document.createElement("dialog");

    dialog.id = id;
    dialog.className = "ui-dialog";

    dialog.setAttribute(
        "aria-labelledby",
        `${id}-title`
    );

    dialog.setAttribute(
        "aria-describedby",
        `${id}-description`
    );

    const header = document.createElement("header");
    header.className = "ui-dialog__header";

    const heading = document.createElement("h2");
    heading.id = `${id}-title`;
    heading.className = "ui-dialog__title";
    heading.textContent = title;

    const paragraph = document.createElement("p");
    paragraph.id = `${id}-description`;
    paragraph.className = "ui-dialog__description";
    paragraph.textContent = description;

    header.append(heading, paragraph);

    const content = document.createElement("div");
    content.className = "ui-dialog__content";

    const footer = document.createElement("form");
    footer.method = "dialog";
    footer.className = "ui-dialog__footer";

    const backButton = document.createElement("button");

    backButton.type = "submit";
    backButton.value = "back";
    backButton.className =
        "start-menu__button start-menu__button--secondary";

    backButton.textContent = "Back";
    backButton.autofocus = true;

    footer.append(backButton);

    dialog.append(
        header,
        content,
        footer
    );

    return {
        dialog,
        content,
    };
}