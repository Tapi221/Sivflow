import SwiftUI

struct CardEditScreen: View {
    let card: StudyCard?
    let cardSetId: String
    let service: StudyBrowsingService
    
    @Environment(\.dismiss) var dismiss
    
    @State private var title: String = ""
    @State private var questionNumber: String = ""
    @State private var frontContent: String = ""
    @State private var backContent: String = ""
    @State private var selectedTagIds: Set<String> = []
    @State private var isDraft: Bool = false
    @State private var isUncertain: Bool = false
    @State private var isCompleted: Bool = false
    @State private var isSilent: Bool = false
    @State private var showDeleteConfirmation = false
    @State private var isSaving = false
    
    private var allTags: [StudyTag] {
        // TODO: Get all tags from service
        []
    }
    
    var isNew: Bool {
        card == nil
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Card Information") {
                    TextField("Title", text: $title)
                    TextField("Question Number", text: $questionNumber)
                }
                
                Section("Front Content") {
                    TextEditor(text: $frontContent)
                        .frame(minHeight: 120)
                        .font(.body)
                }
                
                Section("Back Content") {
                    TextEditor(text: $backContent)
                        .frame(minHeight: 120)
                        .font(.body)
                }
                
                Section("Tags") {
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        if allTags.isEmpty {
                            Text("No tags available")
                                .foregroundStyle(.secondary)
                        } else {
                            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                                ForEach(allTags) { tag in
                                    HStack {
                                        Image(systemName: selectedTagIds.contains(tag.id) ? "checkmark.square.fill" : "square")
                                            .foregroundStyle(Color(tag.color))
                                        Text(tag.name)
                                        Spacer()
                                    }
                                    .contentShape(Rectangle())
                                    .onTapGesture {
                                        if selectedTagIds.contains(tag.id) {
                                            selectedTagIds.remove(tag.id)
                                        } else {
                                            selectedTagIds.insert(tag.id)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                Section("Status") {
                    Toggle("Draft", isOn: $isDraft)
                    Toggle("Uncertain", isOn: $isUncertain)
                    Toggle("Completed", isOn: $isCompleted)
                    Toggle("Silent", isOn: $isSilent)
                }
                
                Section {
                    HStack {
                        Spacer()
                        Button(action: saveCard) {
                            if isSaving {
                                ProgressView()
                            } else {
                                Text(isNew ? "Create Card" : "Save Changes")
                            }
                        }
                        .disabled(isSaving || title.trimmingCharacters(in: .whitespaces).isEmpty)
                        Spacer()
                    }
                }
                
                if !isNew {
                    Section {
                        HStack {
                            Spacer()
                            Button(role: .destructive, action: { showDeleteConfirmation = true }) {
                                Text("Delete Card")
                            }
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle(isNew ? "New Card" : "Edit Card")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .alert("Delete Card", isPresented: $showDeleteConfirmation) {
                Button("Delete", role: .destructive) {
                    deleteCard()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to delete this card? This action cannot be undone.")
            }
            .onAppear {
                if let card = card {
                    title = card.displayTitle
                    questionNumber = card.questionNumber
                    frontContent = card.front.blocks.compactMap(\.primaryText).joined(separator: "\n")
                    backContent = card.back.blocks.compactMap(\.primaryText).joined(separator: "\n")
                    selectedTagIds = Set(card.tagIds)
                    isDraft = card.isDraft
                    isUncertain = card.hasUncertainty
                    isCompleted = card.isCompleted
                    isSilent = card.isSilent
                }
            }
        }
    }
    
    private func saveCard() {
        isSaving = true
        
        // TODO: Implement actual save logic
        // This would involve:
        // 1. Creating/updating the card in the data store
        // 2. Uploading to Firebase if cloud sync is enabled
        // 3. Handling errors appropriately
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            isSaving = false
            dismiss()
        }
    }
    
    private func deleteCard() {
        // TODO: Implement actual delete logic
        dismiss()
    }
}

#Preview {
    CardEditScreen(
        card: nil,
        cardSetId: "test-set",
        service: MockStudyBrowsingService()
    )
}
