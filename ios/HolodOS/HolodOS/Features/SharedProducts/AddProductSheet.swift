import SwiftUI

struct AddProductSheet: View {
    let listTitle: String
    let appearance: HolodListAppearance
    @Binding var productName: String
    let onDismiss: () -> Void
    let onAdd: () async throws -> Void

    @FocusState private var isFocused: Bool
    @State private var errorMessage: String?
    @State private var isSubmitting = false

    var body: some View {
        ZStack {
            // Invisible dismiss target — no dimming; card floats over the list.
            Color.clear
                .ignoresSafeArea()
                .contentShape(Rectangle())
                .onTapGesture(perform: dismissAndClear)

            VStack(spacing: 0) {
                card
                    .padding(.horizontal, 28)
                    .padding(.top, 72)

                Spacer(minLength: 0)
            }
        }
        // Keep the dialog fixed; keyboard opens underneath without pushing the card.
        .ignoresSafeArea(.keyboard)
        .environment(\.holodListAppearance, appearance)
        .onAppear { isFocused = true }
        .preferredColorScheme(appearance == .fridge ? .dark : .light)
    }

    private var card: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Новый продукт")
                .font(.holodBodyMedium)
                .foregroundStyle(appearance.primaryText)
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 12)
                .frame(maxWidth: .infinity, alignment: .leading)

            HolodDivider()
                .padding(.bottom, 16)

            VStack(alignment: .leading, spacing: 16) {
                Text("Продукт будет добавлен в «\(listTitle)»")
                    .font(.holodSubheadline)
                    .foregroundStyle(appearance.secondaryText)

                TextField("Название", text: $productName)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($isFocused)
                    .font(.holodBody)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .overlay {
                        Rectangle()
                            .strokeBorder(fieldBorderColor, lineWidth: 1)
                    }
                    .foregroundStyle(appearance.primaryText)
                    .submitLabel(.done)
                    .onSubmit { Task { await submit() } }

                HolodFilledButton.primary(
                    title: "Добавить",
                    appearance: appearance,
                    isEnabled: !isSubmitDisabled
                ) {
                    Task { await submit() }
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.holodCaption)
                        .foregroundStyle(Color.holodBarleyCorn)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
        }
        .holodPaperBackground(appearance)
        .clipShape(RoundedRectangle(cornerRadius: HolodCornerRadius.container, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: HolodCornerRadius.container, style: .continuous)
                .strokeBorder(appearance.divider, lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.18), radius: 24, y: 10)
    }

    private var fieldBorderColor: Color {
        appearance == .fridge ? Color.holodWhiteRock.opacity(0.25) : Color.holodAkaroa
    }

    private var isSubmitDisabled: Bool {
        isSubmitting || productName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func dismissAndClear() {
        isFocused = false
        onDismiss()
    }

    private func submit() async {
        guard !isSubmitDisabled else { return }
        isSubmitting = true
        errorMessage = nil

        do {
            try await onAdd()
            isFocused = false
            onDismiss()
        } catch {
            errorMessage = error.localizedDescription
        }

        isSubmitting = false
    }
}
