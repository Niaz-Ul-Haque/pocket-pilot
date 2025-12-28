# QA Manual Testing Guide

**Application:** Pocket Pilot (Personal Finance Tracker)
**Version:** v1.1
**Last Updated:** 2025-12-27

---

## Table of Contents

1. [Testing Prerequisites](#1-testing-prerequisites)
2. [Authentication Flows](#2-authentication-flows)
3. [Onboarding Flow](#3-onboarding-flow) 
4. [Dashboard](#4-dashboard)
5. [Accounts Management](#5-accounts-management)
6. [Categories Management](#6-categories-management)
7. [Transactions Management](#7-transactions-management)
8. [Transfers Between Accounts](#8-transfers-between-accounts)
9. [Tags Management](#9-tags-management)
10. [Budgets Management](#10-budgets-management)
11. [Savings Goals](#11-savings-goals)
12. [Bills Management](#12-bills-management)
13. [Recurring Transactions](#13-recurring-transactions)
14. [AI Chat Assistant](#14-ai-chat-assistant)
15. [Notifications](#15-notifications)
16. [Data Export](#16-data-export)
17. [Account Settings](#17-account-settings)
18. [Responsive Design Testing](#18-responsive-design-testing)
19. [Error Handling](#19-error-handling)
20. [Edge Cases](#20-edge-cases)

---

## 1. Testing Prerequisites

### Environment Setup

- [ ] Application is running locally (`npm run dev`) or deployed to staging
- [ ] Access to a Google account for authentication testing
- [ ] Supabase database is connected and accessible
- [ ] Multiple browser windows/tabs available for testing
- [ ] Mobile device or browser DevTools for responsive testing

### Test Data Preparation

Before testing, ensure you have:
- At least 2-3 different Google accounts for multi-user testing
- Clear test data expectations (amounts, dates, descriptions)

---

## 2. Authentication Flows

### 2.1 Landing Page Access

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to root URL (`/`) | Landing page displays with "Track Your Finances" heading |
| 2 | Verify "Sign in with Google" button is visible | Button displayed prominently |
| 3 | Verify "Get Started" button is visible | Button displayed |
| 4 | Click on any protected route (e.g., `/dashboard`) while logged out | Redirected to login page |

### 2.2 Google Sign-In (New User)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Sign in with Google" button | Google OAuth popup/redirect appears |
| 2 | Select a Google account (new user) | Successfully authenticated |
| 3 | Observe redirect after authentication | Redirected to `/onboarding` page |
| 4 | Verify session is active | User avatar/name visible in header |

### 2.3 Google Sign-In (Returning User)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Sign in with Google" button | Google OAuth popup/redirect appears |
| 2 | Select a Google account (returning user with completed onboarding) | Successfully authenticated |
| 3 | Observe redirect after authentication | Redirected directly to `/dashboard` |

### 2.4 Sign Out

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on user avatar in the top-right | Dropdown menu appears |
| 2 | Click "Sign out" button | User is logged out |
| 3 | Attempt to access `/dashboard` | Redirected to login page |
| 4 | Verify session is cleared | No user info displayed |

### 2.5 Session Persistence

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Sign in successfully | Session established |
| 2 | Close the browser tab (not window) | - |
| 3 | Open a new tab and navigate to `/dashboard` | User remains logged in |
| 4 | Close the browser completely | - |
| 5 | Reopen browser and navigate to `/dashboard` | Session may persist (depends on browser settings) |

---

## 3. Onboarding Flow

### 3.1 Initial Onboarding Display

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Sign in as a new user | Redirected to onboarding page |
| 2 | Verify welcome message is displayed | "Welcome to Pocket Pilot" or similar heading |
| 3 | Verify step indicator is shown | Step 1 of N visible |

### 3.2 Account Creation Step

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify account creation form is displayed | Form with Name, Type, and Balance fields |
| 2 | Leave all fields empty and click "Continue" | Validation errors displayed |
| 3 | Enter valid account name (e.g., "Main Checking") | Field accepts input |
| 4 | Select account type from dropdown | Options: Checking, Savings, Credit Card, Cash, Investment |
| 5 | Enter initial balance (e.g., "1500.00") | Field accepts decimal input |
| 6 | Click "Continue" or "Next" button | Moves to next step or completes onboarding |

### 3.3 Budgeting Framework Selection (if applicable)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View budgeting approach options | Options like 50/30/20, Zero-Based, etc. displayed |
| 2 | Select a budgeting framework | Option is selected/highlighted |
| 3 | Click "Continue" | Selection is saved |

### 3.4 Onboarding Completion

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete all onboarding steps | Success message displayed |
| 2 | Click "Go to Dashboard" or similar | Redirected to `/dashboard` |
| 3 | Navigate back to `/onboarding` | Should redirect to dashboard (already completed) |

---

## 4. Dashboard

### 4.1 Dashboard Overview

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard` | Dashboard page loads successfully |
| 2 | Verify greeting displays user name | "Welcome back, [Name]" or similar |
| 3 | Verify account summary cards are visible | Total balance, income, expenses cards |
| 4 | Verify charts are rendered | Spending by category pie/bar chart visible |
| 5 | Verify recent transactions list | Shows last 5-10 transactions |
| 6 | Verify budget status summary | Budget progress indicators visible |

### 4.2 Dashboard Summary Cards

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Check "Total Balance" card | Shows sum of all account balances |
| 2 | Check "Monthly Income" card | Shows sum of income transactions this month |
| 3 | Check "Monthly Expenses" card | Shows sum of expense transactions this month |
| 4 | Add a new income transaction | Income card updates with new total |
| 5 | Add a new expense transaction | Expenses card updates with new total |

### 4.3 Dashboard Charts

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View spending by category chart | Pie/bar chart displays categories |
| 2 | Hover over chart segments | Tooltip shows category name and amount |
| 3 | Click on chart segment (if interactive) | May filter or navigate to category |
| 4 | View income vs expenses trend | Line/bar chart shows monthly comparison |

### 4.4 Quick Actions

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Transaction" quick action | Transaction form modal opens |
| 2 | Click on notification bell | Notifications dropdown opens |
| 3 | Click on AI chat button (sparkle icon) | AI chat modal opens |

---

## 5. Accounts Management

### 5.1 View Accounts List

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard/accounts` | Accounts page loads |
| 2 | Verify all accounts are displayed as cards | Each account shows name, type, balance |
| 3 | Verify balance colors | Positive = green/neutral, Negative = red |
| 4 | If no accounts exist | Empty state with "Add Your First Account" button |

### 5.2 Create New Account

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Account" button | Create account dialog opens |
| 2 | Leave name field empty, click save | Validation error: "Name is required" |
| 3 | Enter account name (e.g., "Savings Account") | Field accepts input |
| 4 | Select account type: "Savings" | Type selected |
| 5 | Enter initial balance: "5000.00" | Balance field accepts decimal |
| 6 | Click "Create Account" or "Save" | Account created, appears in list |
| 7 | Verify success toast notification | "Account created successfully" message |

### 5.3 Edit Existing Account

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click the 3-dot menu on an account card | Dropdown menu appears |
| 2 | Click "Edit" option | Edit dialog opens with pre-filled data |
| 3 | Change the account name | Field updates |
| 4 | Change the account type | Type dropdown allows selection |
| 5 | Click "Update Account" or "Save" | Account updated in list |
| 6 | Verify changes are reflected | Updated name/type visible |

### 5.4 Delete Account

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click the 3-dot menu on an account card | Dropdown menu appears |
| 2 | Click "Delete" option | Confirmation dialog appears |
| 3 | Read warning about deleting transactions | Warning text visible |
| 4 | Click "Cancel" | Dialog closes, account remains |
| 5 | Repeat and click "Delete" to confirm | Account removed from list |
| 6 | Verify associated transactions are deleted | Transactions with this account no longer exist |

### 5.5 Account Balance Verification

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Note the current balance of an account | Record initial balance |
| 2 | Add an expense transaction of $50 to this account | Transaction created |
| 3 | Navigate back to accounts page | Balance decreased by $50 |
| 4 | Add an income transaction of $100 to this account | Transaction created |
| 5 | Navigate back to accounts page | Balance increased by $100 |

---

## 6. Categories Management

### 6.1 View Categories

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard/categories` | Categories page loads |
| 2 | Verify categories are grouped by type | Expense, Income, Transfer sections |
| 3 | Verify default categories exist | Food, Transportation, Salary, etc. |
| 4 | Verify category type icons | Expense = red arrow, Income = green arrow |
| 5 | Verify tax-related badge (if applicable) | "Tax related" label shown |

### 6.2 Create New Category

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Category" button | Create category dialog opens |
| 2 | Leave name empty, click save | Validation error displayed |
| 3 | Enter category name (e.g., "Subscriptions") | Field accepts input |
| 4 | Select type: "Expense" | Type selected |
| 5 | Toggle "Tax Related" (optional) | Checkbox toggles |
| 6 | Click "Create" or "Save" | Category created |
| 7 | Verify category appears in correct section | Listed under "Expense" group |

### 6.3 Edit Category

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click 3-dot menu on a category card | Dropdown appears |
| 2 | Click "Edit" | Edit dialog opens with current values |
| 3 | Change category name | Field updates |
| 4 | Click "Save" | Category updated |
| 5 | Verify changes reflected in list | New name displayed |

### 6.4 Archive Category

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click 3-dot menu on a category card | Dropdown appears |
| 2 | Click "Archive" | Confirmation dialog appears |
| 3 | Read the archive warning | "Won't appear in dropdowns" message |
| 4 | Click "Archive" to confirm | Category removed from active list |
| 5 | Existing transactions with this category | Still show the category name |
| 6 | Create new transaction | Archived category not in dropdown |

---

## 7. Transactions Management

### 7.1 View Transactions List

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard/transactions` | Transactions page loads |
| 2 | Verify transaction table/list is displayed | Columns: Date, Description, Amount, Category, Account |
| 3 | Verify expense amounts are red/negative | Expenses show with minus or red color |
| 4 | Verify income amounts are green/positive | Income shows with plus or green color |
| 5 | If no transactions | Empty state with "Add Transaction" button |

### 7.2 Create Expense Transaction

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Transaction" button | Transaction form dialog opens |
| 2 | Select Type: "Expense" | Expense type selected |
| 3 | Select Date using date picker | Date is set |
| 4 | Enter Amount: "45.99" | Amount field accepts value |
| 5 | Select Account from dropdown | Account selected |
| 6 | Select Category from dropdown | Only expense categories shown |
| 7 | Add optional description | Text field accepts input |
| 8 | Click "Add Transaction" | Transaction created |
| 9 | Verify transaction appears in list | New transaction at correct position |
| 10 | Verify amount is displayed as negative | "-$45.99" or similar |

### 7.3 Create Income Transaction

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Transaction" button | Form dialog opens |
| 2 | Select Type: "Income" | Income type selected |
| 3 | Set date, amount ($3000), account | Fields filled |
| 4 | Select Category from dropdown | Only income categories shown |
| 5 | Add description: "Monthly Salary" | Description entered |
| 6 | Click "Add Transaction" | Transaction created |
| 7 | Verify transaction appears in list | Shows as positive amount |

### 7.4 Edit Transaction

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on a transaction row or edit icon | Edit dialog opens with pre-filled data |
| 2 | Change the amount | Field updates |
| 3 | Change the category | Category dropdown allows selection |
| 4 | Change the date | Date picker allows selection |
| 5 | Click "Update Transaction" | Transaction updated |
| 6 | Verify changes in transaction list | Updated values displayed |

### 7.5 Delete Transaction

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click delete icon on a transaction | Confirmation dialog appears |
| 2 | Click "Cancel" | Dialog closes, transaction remains |
| 3 | Click delete again, then "Delete" | Transaction removed from list |
| 4 | Verify related account balance updates | Balance recalculated |

### 7.6 Transaction Filtering

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on account filter dropdown | Account options displayed |
| 2 | Select a specific account | Only transactions for that account shown |
| 3 | Click on category filter dropdown | Category options displayed |
| 4 | Select a specific category | Only transactions with that category shown |
| 5 | Select date range filter (if available) | Transactions within date range shown |
| 6 | Click "Clear Filters" or reset | All transactions displayed again |

### 7.7 Transaction Pagination

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create more than 20 transactions | Transactions created |
| 2 | Verify pagination controls appear | "Previous/Next" or page numbers visible |
| 3 | Click "Next" page | Second page of transactions loads |
| 4 | Click "Previous" page | Returns to first page |
| 5 | Verify correct count indicator | "Showing 1-20 of X" message |

### 7.8 Transaction Search

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter search term in search field | Search field accepts input |
| 2 | Search by description keyword | Matching transactions displayed |
| 3 | Clear search field | All transactions displayed |

---

## 8. Transfers Between Accounts

### 8.1 Create Transfer

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Ensure at least 2 accounts exist | Prerequisite check |
| 2 | Click "Transfer" or access transfer form | Transfer form/dialog opens |
| 3 | Select "From Account" | Dropdown shows all accounts |
| 4 | Select "To Account" | Same account as "From" is not available |
| 5 | Enter transfer amount: "500.00" | Amount field accepts input |
| 6 | Set transfer date | Date selected |
| 7 | Add optional description | Description entered |
| 8 | Click "Transfer" button | Transfer created |
| 9 | Verify success message | "Transfer completed" notification |

### 8.2 Verify Transfer Creates Two Linked Transactions

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to transactions page | Transactions list loads |
| 2 | Find the transfer transactions | Two transactions with same amount/date |
| 3 | Verify one is expense (From account) | Negative amount shown |
| 4 | Verify one is income (To account) | Positive amount shown |
| 5 | Verify "Transfer" indicator | Badge or icon showing it's a transfer |

### 8.3 Verify Account Balances After Transfer

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Note "From Account" initial balance | Record balance |
| 2 | Note "To Account" initial balance | Record balance |
| 3 | Create transfer of $200 | Transfer completed |
| 4 | Check "From Account" balance | Decreased by $200 |
| 5 | Check "To Account" balance | Increased by $200 |

---

## 9. Tags Management

### 9.1 View/Access Tag Manager

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open transaction form | Transaction dialog opens |
| 2 | Locate Tags section | "Tags (Optional)" label visible |
| 3 | Click on tag picker or "Manage Tags" | Tag picker/manager opens |

### 9.2 Create New Tag

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Create new tag" or plus icon | Tag creation form appears |
| 2 | Enter tag name (e.g., "Business") | Name field accepts input |
| 3 | Select tag color (if available) | Color picker/options shown |
| 4 | Click "Create" or "Save" | Tag created |
| 5 | Verify tag appears in tag list | New tag visible in picker |

### 9.3 Apply Tags to Transaction

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create or edit a transaction | Transaction form open |
| 2 | Click on tag picker | Available tags shown |
| 3 | Select one or more tags | Tags highlighted/checked |
| 4 | Save the transaction | Transaction saved with tags |
| 5 | View transaction in list | Tags displayed as badges |

### 9.4 Remove Tags from Transaction

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Edit a transaction with tags | Form opens with tags selected |
| 2 | Click on selected tag to deselect | Tag is unchecked/removed |
| 3 | Save transaction | Transaction updated |
| 4 | Verify tags removed | Tags no longer shown on transaction |

### 9.5 Edit Tag

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open tag manager modal | Tag manager opens |
| 2 | Click edit icon on a tag | Edit form opens |
| 3 | Change tag name | Name field updates |
| 4 | Save changes | Tag updated |
| 5 | Verify transactions with this tag | Show updated tag name |

### 9.6 Delete Tag

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open tag manager modal | Tag manager opens |
| 2 | Click delete icon on a tag | Confirmation appears |
| 3 | Confirm deletion | Tag removed |
| 4 | Verify transactions previously tagged | Tag removed from those transactions |

---

## 10. Budgets Management

### 10.1 View Budgets Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard/budgets` | Budgets page loads |
| 2 | Verify current month is displayed | "Monthly Budgets - December 2024" or similar |
| 3 | Verify budget cards are displayed | Each budget shows category, limit, spent, remaining |
| 4 | If no budgets | Empty state with "Create Your First Budget" |

### 10.2 Create New Budget

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Budget" button | Budget form dialog opens |
| 2 | Select a category without existing budget | Dropdown shows expense categories only |
| 3 | Enter budget amount: "500.00" | Amount field accepts input |
| 4 | Toggle "Rollover" option (if desired) | Rollover checkbox toggled |
| 5 | Click "Create Budget" | Budget created |
| 6 | Verify budget appears in list | Budget card shows with 0% spent |

### 10.3 Budget Progress Tracking

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create a $200 budget for "Food" category | Budget created |
| 2 | Add a $50 expense in "Food" category | Transaction created |
| 3 | Navigate to budgets page | Budget shows 25% spent ($50 of $200) |
| 4 | Add another $100 expense in "Food" | Transaction created |
| 5 | Check budget progress | Shows 75% spent ($150 of $200) |
| 6 | Verify progress bar color | Green/yellow based on threshold |

### 10.4 Budget Status Indicators

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Budget with <75% spent | Green progress bar, "On track" status |
| 2 | Budget with 75-99% spent | Yellow progress bar, "Nearing limit" status |
| 3 | Budget with 100%+ spent | Red progress bar, "Over budget" status |

### 10.5 Edit Budget

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click edit (pencil) icon on a budget | Edit dialog opens |
| 2 | Change budget amount | Amount field updates |
| 3 | Toggle rollover setting | Checkbox state changes |
| 4 | Click "Save" | Budget updated |
| 5 | Verify percentage recalculated | New percentage based on new limit |

### 10.6 Delete Budget

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click delete (trash) icon on a budget | Confirmation dialog appears |
| 2 | Click "Cancel" | Dialog closes |
| 3 | Click delete again, confirm | Budget removed from list |
| 4 | Transactions in that category | Still exist, unaffected |

### 10.7 Budget Rollover

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create budget with rollover enabled | Budget created |
| 2 | Spend less than budget limit | Under budget for month |
| 3 | (Simulate) Move to next month | Rollover amount shown |
| 4 | Verify effective budget increased | Base + rollover = effective budget |
| 5 | Progress calculated against effective | Percentage uses effective budget |

---

## 11. Savings Goals

### 11.1 View Goals Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard/goals` | Goals page loads |
| 2 | Verify active and completed sections | Separate areas for each |
| 3 | If no goals | Empty state with "Create Your First Goal" |

### 11.2 Create New Goal

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Goal" button | Goal form dialog opens |
| 2 | Enter goal name: "Emergency Fund" | Name field accepts input |
| 3 | Enter target amount: "10000.00" | Amount field accepts value |
| 4 | Enter initial amount saved: "500.00" (optional) | Current amount set |
| 5 | Set target date (optional) | Date picker allows selection |
| 6 | Click "Create Goal" | Goal created |
| 7 | Verify goal appears in active list | Shows 5% progress ($500 of $10,000) |

### 11.3 Add Contribution to Goal

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Contribution" on a goal card | Contribution form opens |
| 2 | Enter contribution amount: "250.00" | Amount entered |
| 3 | Set contribution date | Date selected |
| 4 | Add optional note | Note entered |
| 5 | Click "Add Contribution" | Contribution saved |
| 6 | Verify goal progress updates | New current amount, higher percentage |

### 11.4 Goal Progress Display

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View goal card details | Progress bar, percentage, amounts |
| 2 | Verify "X saved" amount | Current contribution total |
| 3 | Verify "X to go" remaining | Target minus current |
| 4 | Verify target date display | Shows formatted date if set |
| 5 | Verify monthly required (if date set) | Shows monthly savings needed |

### 11.5 Complete a Goal

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add contributions until target reached | Contributions added |
| 2 | When current >= target | Goal marked as "Complete" |
| 3 | Verify "Complete" badge on goal | Green checkmark badge |
| 4 | Verify goal moves to "Completed" section | Listed in completed area |

### 11.6 Edit Goal

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click edit (pencil) icon on goal | Edit dialog opens |
| 2 | Change goal name | Name updates |
| 3 | Change target amount | Amount updates |
| 4 | Change target date | Date updates |
| 5 | Save changes | Goal updated |

### 11.7 Delete Goal

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click delete (trash) icon on goal | Confirmation dialog |
| 2 | Warning mentions contributions will be deleted | Message displayed |
| 3 | Confirm deletion | Goal removed |
| 4 | All contributions for goal | Deleted |

### 11.8 Overdue Goal

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create goal with past target date | Goal created |
| 2 | Do not reach target amount | Goal incomplete |
| 3 | Verify "Overdue" badge | Red warning badge displayed |

---

## 12. Bills Management

### 12.1 View Bills Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard/bills` | Bills page loads |
| 2 | Verify summary cards | "Bills Due Soon", "Monthly Total", "Auto-Pay Enabled" |
| 3 | Verify "Attention Required" section | Overdue or due-today bills highlighted |
| 4 | Verify "Upcoming Bills" section | Future bills listed |
| 5 | If no bills | Empty state with "Add Your First Bill" |

### 12.2 Create New Bill

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Bill" button | Bill form dialog opens |
| 2 | Enter bill name: "Netflix" | Name entered |
| 3 | Enter amount: "15.99" | Amount entered |
| 4 | Select frequency: "Monthly" | Frequency selected |
| 5 | Set next due date | Date selected |
| 6 | Select category (optional) | Category dropdown works |
| 7 | Toggle "Auto-Pay" (optional) | Checkbox toggles |
| 8 | Click "Add Bill" | Bill created |
| 9 | Verify bill appears in appropriate section | Listed based on due date |

### 12.3 Bill Status Indicators

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Bill with past due date | Shows "Overdue" badge (red) |
| 2 | Bill due today | Shows "Due Today" badge |
| 3 | Bill due within 7 days | Shows "Due Soon" badge (yellow) |
| 4 | Bill due later | Shows days until due |

### 12.4 Mark Bill as Paid

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click 3-dot menu on a bill | Dropdown appears |
| 2 | Click "Mark as Paid" | Payment form opens |
| 3 | Confirm or adjust payment amount | Amount pre-filled |
| 4 | Select account for payment | Account dropdown |
| 5 | Click "Mark as Paid" | Bill marked paid |
| 6 | Verify next due date advances | New due date based on frequency |
| 7 | Verify expense transaction created | Transaction in transactions list |

### 12.5 Bill Frequency Options

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create bill with "Weekly" frequency | Bill created |
| 2 | Mark as paid | Due date advances 7 days |
| 3 | Create bill with "Monthly" frequency | Bill created |
| 4 | Mark as paid | Due date advances 1 month |
| 5 | Create bill with "Yearly" frequency | Bill created |
| 6 | Mark as paid | Due date advances 1 year |

### 12.6 Deactivate/Activate Bill

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click 3-dot menu on active bill | Dropdown appears |
| 2 | Click "Deactivate" | Bill deactivated |
| 3 | Toggle "Show inactive" switch | Inactive bills visible |
| 4 | Verify deactivated bill appears dimmed | Reduced opacity |
| 5 | Click "Activate" on inactive bill | Bill reactivated |

### 12.7 Edit Bill

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click 3-dot menu, then "Edit" | Edit form opens |
| 2 | Change bill amount | Amount updates |
| 3 | Change frequency | Frequency updates |
| 4 | Save changes | Bill updated |

### 12.8 Delete Bill

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click 3-dot menu, then "Delete" | Confirmation dialog |
| 2 | Confirm deletion | Bill removed |
| 3 | Past payment transactions | Still exist (not deleted) |

---

## 13. Recurring Transactions

### 13.1 View Recurring Transactions Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard/recurring` | Recurring transactions page loads |
| 2 | Verify summary cards | Active count, Monthly Expenses, Monthly Income, Due Today |
| 3 | Verify transactions table | Description, Amount, Frequency, Next Date, Account |
| 4 | If no recurring transactions | Empty state message |

### 13.2 Create Recurring Transaction

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add" button | Recurring transaction form opens |
| 2 | Enter description: "Monthly Rent" | Description entered |
| 3 | Enter amount: "1500.00" | Amount entered |
| 4 | Select type: "Expense" | Type determines amount sign |
| 5 | Select frequency: "Monthly" | Frequency selected |
| 6 | Set next occurrence date | Date selected |
| 7 | Select account | Account selected |
| 8 | Select category (optional) | Category selected |
| 9 | Click "Create" | Recurring transaction created |

### 13.3 Generate Due Transactions

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create recurring transaction due today or past | Recurring created |
| 2 | Click "Generate Due" button | Generation process runs |
| 3 | Verify success message | "Created X transaction(s)" |
| 4 | Navigate to transactions page | Actual transactions created |
| 5 | Check recurring transaction | Next date advanced |

### 13.4 Due Today Alert

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Have recurring transactions due today | Transactions exist |
| 2 | View recurring page | "Transactions Due" alert card visible |
| 3 | Click "Generate Now" in alert | Transactions generated |

### 13.5 Edit Recurring Transaction

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click 3-dot menu, then "Edit" | Edit form opens |
| 2 | Change amount | Amount updates |
| 3 | Change frequency | Frequency updates |
| 4 | Save changes | Recurring transaction updated |
| 5 | Future generations use new settings | Verified on next generation |

### 13.6 Deactivate/Activate Recurring Transaction

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click 3-dot menu, then "Deactivate" | Transaction deactivated |
| 2 | Toggle "Show inactive" | Inactive items visible |
| 3 | Verify deactivated appears dimmed | Reduced opacity |
| 4 | Click "Activate" | Transaction reactivated |

### 13.7 Delete Recurring Transaction

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click 3-dot menu, then "Delete" | Confirmation dialog |
| 2 | Confirm deletion | Recurring transaction removed |
| 3 | Previously generated transactions | Still exist |

---

## 14. AI Chat Assistant

### 14.1 Open AI Chat Modal

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on AI chat button (sparkle icon in header) | AI chat modal opens |
| 2 | Verify modal has chat history sidebar | Left sidebar with conversations |
| 3 | Verify main chat area | Message area with input field |
| 4 | Verify welcome message/suggestions | "How can I help you today?" |

### 14.2 Start New Conversation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type a message: "How much did I spend this month?" | Message entered |
| 2 | Press Enter or click Send | Message sent |
| 3 | Verify user message appears in chat | Message displayed on right side |
| 4 | Verify AI is thinking | Loading indicator shown |
| 5 | Verify AI response appears | Response displayed on left side |
| 6 | Verify conversation saved to history | New conversation in sidebar |

### 14.3 Add Transaction via AI

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type: "Add $50 for groceries" | Message sent |
| 2 | Wait for AI response | AI acknowledges and may ask for account |
| 3 | Provide account if asked | Response sent |
| 4 | Verify transaction created | AI confirms transaction added |
| 5 | Navigate to transactions page | New transaction exists |

### 14.4 Query Financial Data

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Ask: "What's my total balance?" | Message sent |
| 2 | Verify AI response with balance | Shows sum of accounts |
| 3 | Ask: "What's my budget status?" | Message sent |
| 4 | Verify AI shows budget information | Budget amounts and percentages |

### 14.5 Use Suggestion Chips

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In new chat, view suggestion chips | Quick action buttons visible |
| 2 | Click "Add $50 for groceries" | Message auto-filled and sent |
| 3 | Click "How much did I spend this month?" | Query sent |

### 14.6 Switch Between Conversations

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Have multiple conversations in history | Multiple items in sidebar |
| 2 | Click on a previous conversation | Chat loads that conversation |
| 3 | Previous messages displayed | Full history shown |
| 4 | Click "New Chat" button | Starts fresh conversation |

### 14.7 Delete Conversation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Hover over conversation in sidebar | Delete icon appears |
| 2 | Click delete icon | Confirmation dialog |
| 3 | Confirm deletion | Conversation removed from history |

### 14.8 Voice Input (if supported)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click microphone button | Listening indicator appears |
| 2 | Speak: "Add fifty dollars for lunch" | Speech transcribed to text |
| 3 | Verify transcribed text in input | Text appears in input field |
| 4 | Send the message | Message processed normally |

### 14.9 Voice Output (if enabled)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open voice settings (gear icon) | Settings popover opens |
| 2 | Enable "Voice output" | Toggle switched on |
| 3 | Enable "Auto-speak responses" | Toggle switched on |
| 4 | Send a message | Wait for response |
| 5 | Verify response is spoken | Audio plays |
| 6 | Click speaker button on message | Can manually play/stop |

### 14.10 Close Chat Modal

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click X button | Modal closes |
| 2 | Click outside modal (if applicable) | Modal closes |
| 3 | Reopen modal | Previous state preserved |

---

## 15. Notifications

### 15.1 View Notification Bell

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Look for bell icon in header | Bell icon visible |
| 2 | When no notifications | No badge on bell |
| 3 | When notifications exist | Badge with count appears |
| 4 | Critical notifications | Red badge |
| 5 | Warning notifications only | Yellow badge |

### 15.2 View Notifications Dropdown

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click notification bell | Dropdown opens |
| 2 | View notification list | Bill and budget alerts shown |
| 3 | Each notification shows title and message | Clear description |
| 4 | Priority indicators visible | Red/yellow icons for urgency |

### 15.3 Bill Notifications

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create bill due today | Bill created |
| 2 | Refresh and check notifications | "Bill Due Today" notification |
| 3 | Create overdue bill | Bill with past due date |
| 4 | Check notifications | "Overdue Bill" notification (critical) |

### 15.4 Budget Notifications

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create budget and exceed 80% | Transactions added |
| 2 | Refresh and check notifications | Budget warning notification |
| 3 | Exceed 100% of budget | Over budget |
| 4 | Check notifications | "Over Budget" notification (critical) |

### 15.5 Click on Notification

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on a bill notification | Navigated to Bills page |
| 2 | Click on a budget notification | Navigated to Budgets page |
| 3 | Dropdown closes after click | Modal/dropdown closes |

### 15.6 Empty Notifications State

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Resolve all bill and budget alerts | No active alerts |
| 2 | Open notifications dropdown | "All caught up!" message |

---

## 16. Data Export

### 16.1 Access Export Functionality

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to transactions page | Page loads |
| 2 | Look for Export button/option | Export button visible |

### 16.2 Export as CSV

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click Export button | Export options appear (or direct download) |
| 2 | Select "CSV" format (if option exists) | CSV selected |
| 3 | Click "Export" or "Download" | File download initiates |
| 4 | Open downloaded file | Valid CSV with transactions |
| 5 | Verify headers | Date, Description, Amount, Type, Category, Account |
| 6 | Verify data rows | Transactions match app data |

### 16.3 Export as JSON

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click Export button | Export options appear |
| 2 | Select "JSON" format | JSON selected |
| 3 | Click "Export" | File download initiates |
| 4 | Open downloaded file | Valid JSON structure |
| 5 | Verify contains transactions array | Data matches app |

### 16.4 Export with Date Filter (if available)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set start and end date filters | Date range selected |
| 2 | Export transactions | File downloads |
| 3 | Verify only transactions in date range | Correct filtering applied |

### 16.5 Export Empty State

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Delete all transactions (or use filters with no results) | No transactions |
| 2 | Attempt export | Error message or empty file |

---

## 17. Account Settings

### 17.1 View Account Settings Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard/account` | Account settings page loads |
| 2 | Verify user profile card | Google avatar, name, email displayed |
| 3 | Verify account information card | Member since, currency, onboarding status |

### 17.2 Update Display Name

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter new display name | Field accepts input |
| 2 | Click "Save Changes" | Save button clicked |
| 3 | Verify success message | Toast notification appears |
| 4 | Refresh page | Display name persisted |

### 17.3 Update Budgeting Framework

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open "Budgeting Approach" dropdown | Options displayed |
| 2 | Select different framework | Framework selected |
| 3 | Click "Save Changes" | Settings saved |
| 4 | Verify selection persisted | Selected value shown on reload |

### 17.4 View Account Information

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Check "Member Since" date | Correct registration date |
| 2 | Check "Currency" | Shows "CAD" |
| 3 | Check "Account Status" | Shows "Active" |
| 4 | Check "Onboarding" status | Shows "Completed" or "Pending" |

---

## 18. Responsive Design Testing

### 18.1 Mobile View (320px - 480px)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Resize browser to mobile width | Layout adjusts |
| 2 | Verify navigation is hamburger menu | Menu icon visible |
| 3 | Open mobile menu | Slide-out or dropdown navigation |
| 4 | Verify cards stack vertically | Single column layout |
| 5 | Verify tables scroll horizontally | Horizontal scroll on tables |
| 6 | Test form inputs | Inputs full width, usable |
| 7 | Test modals/dialogs | Full screen or properly sized |

### 18.2 Tablet View (768px - 1024px)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Resize browser to tablet width | Layout adjusts |
| 2 | Verify 2-column card layouts | Cards in 2 columns |
| 3 | Verify sidebar visibility | May collapse or be visible |
| 4 | Test touch interactions | Buttons/links work |

### 18.3 Desktop View (1024px+)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Full desktop width | Full layout displayed |
| 2 | Verify 3-column layouts where applicable | Cards in 3 columns |
| 3 | Verify sidebar navigation | Fixed or visible sidebar |
| 4 | Verify charts render fully | No cut-off or overflow |

### 18.4 Navigation Sidebar Behavior

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Mobile: tap hamburger menu | Sidebar slides in |
| 2 | Tap outside sidebar or X | Sidebar closes |
| 3 | Tablet: sidebar may be collapsed | Icon-only mode |
| 4 | Desktop: sidebar always visible | Full navigation shown |

---

## 19. Error Handling

### 19.1 Network Error Handling

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Disconnect internet | Network unavailable |
| 2 | Try to load a page | Error message displayed |
| 3 | Try to submit a form | Error toast notification |
| 4 | "Try Again" button works | Retries request when connected |

### 19.2 API Error Responses

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit form with invalid data | Validation errors displayed |
| 2 | Try to access non-existent resource | 404 or "Not found" message |
| 3 | Server error (500) | Generic error message shown |

### 19.3 Form Validation Errors

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit form with empty required fields | Inline error messages |
| 2 | Enter invalid format (e.g., letters in amount) | Field shows error |
| 3 | Enter negative amount where not allowed | Validation error |
| 4 | Fix errors and resubmit | Form submits successfully |

### 19.4 Session Expiry

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Let session expire (or manually clear cookies) | Session ended |
| 2 | Try to access protected page | Redirected to login |
| 3 | Try to submit a form | 401 Unauthorized, redirect to login |

---

## 20. Edge Cases

### 20.1 Large Numbers

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter very large amount: "999999999.99" | Number accepted or validation error |
| 2 | Verify display formatting | Proper currency formatting |
| 3 | Verify calculations work | Totals calculated correctly |

### 20.2 Decimal Precision

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter amount with many decimals: "123.456789" | Rounded to 2 decimals |
| 2 | Verify stored value | Stored as "$123.46" |

### 20.3 Special Characters in Text Fields

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter description with quotes: `Test "quote" description` | Text saved correctly |
| 2 | Enter description with unicode: "Caf? payment" | Unicode preserved |
| 3 | Enter HTML tags: `<script>alert('test')</script>` | Tags escaped, not executed |

### 20.4 Empty States

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | New user with no data | All pages show appropriate empty states |
| 2 | Empty state buttons work | Lead to creation flows |
| 3 | Dashboard with no transactions | Charts show no data gracefully |

### 20.5 Boundary Date Testing

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Transaction on first day of month | Categorized in correct month |
| 2 | Transaction on last day of month | Categorized correctly |
| 3 | Budget calculations span month boundary | Correct month filtering |

### 20.6 Concurrent Operations

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open app in two tabs | Both tabs functional |
| 2 | Create transaction in Tab 1 | Transaction created |
| 3 | Refresh Tab 2 | New transaction visible |
| 4 | Edit same item in both tabs | Last save wins (or conflict handling) |

### 20.7 Maximum Limits

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create 100+ transactions | All stored correctly |
| 2 | Create 20+ accounts | All displayed |
| 3 | Very long description (255+ chars) | Truncated or error |

### 20.8 Time Zone Handling

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create transaction with date | Date stored correctly |
| 2 | View in different timezone (simulate) | Date displayed consistently |
| 3 | Filter by date range | Correct transactions included |

---

## Test Completion Checklist

After completing all test cases, verify:

- [ ] All authentication flows work correctly
- [ ] Onboarding completes successfully for new users
- [ ] Dashboard displays accurate summary data
- [ ] All CRUD operations work for Accounts
- [ ] All CRUD operations work for Categories
- [ ] All CRUD operations work for Transactions
- [ ] Transfer feature correctly updates both accounts
- [ ] Tag system functions properly
- [ ] Budgets track spending accurately
- [ ] Goals track contributions correctly
- [ ] Bills can be created and marked as paid
- [ ] Recurring transactions generate correctly
- [ ] AI chat responds appropriately
- [ ] Notifications display for relevant alerts
- [ ] Export produces valid files
- [ ] Account settings can be updated
- [ ] Application is responsive across devices
- [ ] Error states are handled gracefully

---

## Defect Reporting Template

When reporting issues found during testing:

```
## Defect Title: [Brief description]

### Environment
- Browser: [Chrome/Firefox/Safari/Edge] [Version]
- Device: [Desktop/Mobile/Tablet]
- OS: [Windows/macOS/iOS/Android]
- Screen Size: [Width x Height]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Result
[What should happen]

### Actual Result
[What actually happened]

### Screenshots/Video
[Attach if applicable]

### Severity
- [ ] Critical (Blocker, data loss)
- [ ] High (Major feature broken)
- [ ] Medium (Feature works with workaround)
- [ ] Low (Minor UI issue)

### Additional Notes
[Any other relevant information]
```

---

**Document Maintained By:** QA Team
**Review Schedule:** Before each release
