import SwiftUI

struct AddProductSheet: View {
    let listTitle: String
    @Binding var productName: String
    let onAdd: () async throws -> Void

    @Environment(\.dismiss) private var dismiss
    @FocusState private var isFocused: Bool
    @State private var errorMessage: String?
    @State private var isSubmitting = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Название", text: $productName)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($isFocused)
                        .submitLabel(.done)
                        .onSubmit { Task { await submit() } }
                } footer: {
                    Text("Продукт будет добавлен в «\(listTitle)»")
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Новый продукт")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Добавить") {
                        Task { await submit() }
                    }
                    .disabled(isSubmitDisabled)
                }
            }
            .onAppear { isFocused = true }
        }
        .presentationDetents([.medium])
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
