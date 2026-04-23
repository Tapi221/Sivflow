# FlashCardMaster iOS Native - Implementation TODO

## Phase 1: Firebase Integration & Authentication

- [ ] Add Firebase SDK to Xcode project (CocoaPods/SPM)
- [ ] Create FirebaseManager for configuration and initialization
- [ ] Implement Google Sign-In integration
- [ ] Create AuthenticationService protocol and implementation
- [ ] Add user session management to StudyRuntimeStore
- [ ] Implement sign-out functionality
- [ ] Add biometric authentication support (Face ID / Touch ID)
- [ ] Create authentication UI screens (Sign In, Sign Up)

## Phase 2: Cloud Data Sync

- [ ] Create FirestoreService for cloud data operations
- [ ] Implement snapshot upload/download from Firestore
- [ ] Add conflict resolution logic
- [ ] Implement offline-first data persistence with local cache
- [ ] Add sync status indicator to UI
- [ ] Create data migration utilities

## Phase 3: Card Display & Interaction

- [ ] Implement card flip animation
- [ ] Add pinch-to-zoom functionality for card content
- [ ] Implement display mode toggle (card view / fluid view)
- [ ] Add zoom controls (buttons + gestures)
- [ ] Implement status indicators (Draft, Uncertain, Done, Silent)
- [ ] Add tag display with color coding
- [ ] Create CardDetailScreen enhancements

## Phase 4: Card Editing

- [ ] Create CardEditScreen with form
- [ ] Implement rich text editor for card content
- [ ] Add support for code blocks with syntax highlighting
- [ ] Add support for math blocks (LaTeX rendering)
- [ ] Implement image upload and display
- [ ] Add tag selector UI
- [ ] Implement status flag toggles
- [ ] Create card creation flow
- [ ] Add delete card functionality

## Phase 5: Search & Filtering

- [ ] Create SearchScreen UI
- [ ] Implement full-text search across cards
- [ ] Add filter by card set
- [ ] Add filter by tag
- [ ] Add filter by status (draft, complete, uncertain)
- [ ] Add filter by date range
- [ ] Implement search result sorting
- [ ] Add recent searches feature

## Phase 6: Tag Management

- [ ] Create TagBrowserScreen
- [ ] Implement tag CRUD operations
- [ ] Add tag color selection
- [ ] Implement tag statistics display
- [ ] Add tag-based filtering on card lists

## Phase 7: Folder & CardSet Management

- [ ] Implement folder creation
- [ ] Add folder editing (name, color)
- [ ] Implement folder deletion
- [ ] Add folder move/reorganize functionality
- [ ] Implement card set creation
- [ ] Add card set editing
- [ ] Implement card set deletion
- [ ] Add card set duplication

## Phase 8: Settings & Profile

- [ ] Create SettingsScreen
- [ ] Implement theme toggle (light/dark mode)
- [ ] Add default display mode preference
- [ ] Add font size preference
- [ ] Create ProfileScreen
- [ ] Implement data export
- [ ] Implement data import
- [ ] Add about/version info

## Phase 9: UI/UX Optimization

- [ ] Implement dark mode support throughout app
- [ ] Add haptic feedback for interactions
- [ ] Implement smooth animations and transitions
- [ ] Optimize performance for large datasets
- [ ] Add loading indicators and error handling
- [ ] Implement accessibility features (VoiceOver support)
- [ ] Test on various iOS versions (iOS 14+)
- [ ] Test on various device sizes (iPhone SE to Max)

## Phase 10: Testing & QA

- [ ] Unit tests for services and utilities
- [ ] UI tests for core user flows
- [ ] Performance testing
- [ ] Accessibility testing (VoiceOver, Dynamic Type)
- [ ] Test on physical iOS devices
- [ ] Test all authentication flows
- [ ] Test offline functionality
- [ ] Test data sync scenarios

## Phase 11: Branding & Polish

- [ ] Create app icon variants
- [ ] Design splash screen
- [ ] Implement app intro animations
- [ ] Polish micro-interactions
- [ ] Add haptic feedback patterns
- [ ] Implement custom fonts if needed
- [ ] Create app store screenshots
- [ ] Write app store description

## Phase 12: Deployment Preparation

- [ ] Set up code signing certificates
- [ ] Configure app capabilities (push notifications, etc.)
- [ ] Create TestFlight build
- [ ] Prepare for App Store submission
- [ ] Create release notes
- [ ] Set up CI/CD pipeline (optional)
