import SwiftUI

struct AddProductSheet: View {
    let listTitle: String
    let appearance: HolodListAppearance
    @Binding var productName: String
    let onAdd: () async throws -> Void

    @Environment(\.dismiss) private var dismiss
    @FocusState private var isFocused: Bool
    @State private var errorMessage: String?
    @State private var isSubmitting = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            HolodDivider()
                .padding(.bottom, 20)

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

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .holodPaperBackground(appearance.background)
        .environment(\.holodListAppearance, appearance)
        .onAppear { isFocused = true }
        .preferredColorScheme(appearance == .fridge ? .dark : .light)
        .presentationDetents([.medium])
        .presentationDragIndicator(.hidden)
        .presentationCornerRadius(HolodCornerRadius.control)
        .presentationBackground(appearance.background)
    }

    private var header: some View {
        Text("Новый продукт")
            .font(.holodBodyMedium)
            .foregroundStyle(appearance.primaryText)
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var fieldBorderColor: Color {
        appearance == .fridge ? Color.holodWhiteRock.opacity(0.25) : Color.holodAkaroa
    }

    private var isSubmitDisabled: Bool {
        isSubmitting || productName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func submit() async {
        guard !isSubmitDisabled else { return }
        isSubmitting = true
        errorMessage = nil

        do {
            try await onAdd()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }

        isSubmitting = false
    }
}
